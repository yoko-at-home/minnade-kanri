"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { buildConfirmedMonth, findConfirmedMonth, monthHasEnded } from "@/lib/confirmed";
import {
  ADMIN_LIMIT,
  allowanceIdsForMonth,
  dropAllowanceMember,
  membersFrom,
  PASSPHRASE,
  profileError,
  scheduleAllowanceFromNextMonth,
  type MemberEdits,
} from "@/lib/members";
import { localShiftStore } from "@/lib/persistence";
import {
  addMonths,
  daysInMonth,
  defaultRecord,
  formatLongDate,
  garbageTypeOf,
  normalizeRecord,
  parseDateKey,
  previousWorkDay,
  toDateKey,
} from "@/lib/schedule";
import { seedShifts } from "@/lib/seed";
import {
  getClientSnapshot,
  getClockSnapshot,
  getServerClock,
  getServerSnapshot,
  isServerClock,
  isServerSnapshot,
  subscribe,
  subscribeClock,
  updateStore,
} from "@/lib/store";
import type {
  ActionResult,
  AllowanceTerm,
  ConfirmedMonth,
  Member,
  Role,
  ShiftDay,
  ShiftRecord,
} from "@/lib/types";

type ViewMonth = { year: number; month: number };

type HandoverNote = {
  label: string;
  text: string;
  names: string;
};

type AppContextValue = {
  ready: boolean;
  currentUser: Member | null;
  members: Member[];
  setMemberRole: (memberId: string, role: Role) => ActionResult;
  addMember: (room: string, name: string) => ActionResult;
  updateMember: (memberId: string, edits: MemberEdits) => ActionResult;
  removeMember: (memberId: string) => ActionResult;
  allowanceSchedule: AllowanceTerm[];
  confirmedMonths: ConfirmedMonth[];
  confirmMonth: (year: number, month: number) => ActionResult;
  isMonthConfirmed: (year: number, month: number) => boolean;
  view: ViewMonth;
  today: ViewMonth;
  todayKey: string;
  login: (passphrase: string, memberId: string) => ActionResult;
  switchUser: (memberId: string) => void;
  shiftMonth: (delta: number) => void;
  goToThisMonth: () => void;
  resetDemo: () => void;
  shiftsForMonth: (year: number, month: number) => ShiftDay[];
  getShift: (dateKey: string) => ShiftDay;
  previousHandover: (dateKey: string) => HandoverNote | null;
  claim: (dateKey: string, slotIndex: number) => ActionResult;
  toggleReplacement: (dateKey: string, slotIndex: number) => ActionResult;
  setHandover: (dateKey: string, text: string) => ActionResult;
  setNote: (dateKey: string, text: string) => ActionResult;
  setCapacity: (dateKey: string, capacity: 1 | 2) => ActionResult;
  assign: (
    dateKey: string,
    slotIndex: number,
    memberId: string | null,
  ) => ActionResult;
};

const AppContext = createContext<AppContextValue | null>(null);
const success: ActionResult = { ok: true };

function dropAssignees(
  shifts: Record<string, ShiftRecord>,
  shouldDrop: (memberId: string) => boolean,
  confirmedMonths: readonly ConfirmedMonth[],
): Record<string, ShiftRecord> {
  const next: Record<string, ShiftRecord> = {};
  for (const [dateKey, record] of Object.entries(shifts)) {
    const date = parseDateKey(dateKey);
    if (findConfirmedMonth(confirmedMonths, date.getFullYear(), date.getMonth())) {
      next[dateKey] = record;
      continue;
    }
    next[dateKey] = {
      ...record,
      slots: record.slots.map((slot) =>
        slot.assigneeId && shouldDrop(slot.assigneeId)
          ? { assigneeId: null, seekingReplacement: false }
          : slot,
      ),
    };
  }
  return next;
}

function dayFrom(dateKey: string, shifts: Record<string, ShiftRecord>): ShiftDay {
  const garbageType = garbageTypeOf(parseDateKey(dateKey));
  if (garbageType === "off") {
    return { ...defaultRecord(), date: dateKey, garbageType };
  }
  return {
    ...normalizeRecord(shifts[dateKey] ?? defaultRecord()),
    date: dateKey,
    garbageType,
  };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const stored = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
  const clock = useSyncExternalStore(subscribeClock, getClockSnapshot, getServerClock);
  const ready = !isServerSnapshot(stored) && !isServerClock(clock);
  const { currentUserId, roster, roles, shifts, allowanceSchedule, confirmedMonths } = stored;
  const [pickedMonth, setPickedMonth] = useState<ViewMonth | null>(null);
  const view = useMemo<ViewMonth>(
    () => pickedMonth ?? { year: clock.year, month: clock.month },
    [clock.month, clock.year, pickedMonth],
  );
  const today = useMemo<ViewMonth>(
    () => ({ year: clock.year, month: clock.month }),
    [clock.month, clock.year],
  );

  useEffect(() => {
    if (!ready) return;
    localShiftStore.save(stored);
  }, [ready, stored]);

  const replaceShift = useCallback(
    (dateKey: string, recipe: (current: ShiftRecord) => ShiftRecord) => {
      updateStore((current) => {
        const record = normalizeRecord(current.shifts[dateKey] ?? defaultRecord());
        return {
          ...current,
          shifts: {
            ...current.shifts,
            [dateKey]: normalizeRecord(recipe(record)),
          },
        };
      });
    },
    [],
  );

  const getShift = useCallback(
    (dateKey: string) => dayFrom(dateKey, shifts),
    [shifts],
  );

  const value = useMemo<AppContextValue>(() => {
    const members = membersFrom(roster, roles);
    const currentUser = members.find((member) => member.id === currentUserId) ?? null;
    const memberById = (id: string | null | undefined) =>
      members.find((member) => member.id === id);

    const requireWorkDay = (dateKey: string): ActionResult | null => {
      if (garbageTypeOf(parseDateKey(dateKey)) === "off") {
        return { ok: false, reason: "この日はお休みです" };
      }
      return null;
    };
    const requireOpenMonth = (dateKey: string): ActionResult | null => {
      const date = parseDateKey(dateKey);
      if (findConfirmedMonth(confirmedMonths, date.getFullYear(), date.getMonth())) {
        return { ok: false, reason: "この月の報酬は確定済みです。担当は変更できません。" };
      }
      return null;
    };

    return {
      ready,
      currentUser,
      members,
      allowanceSchedule,
      confirmedMonths,
      confirmMonth(year, month) {
        if (currentUser?.role !== "admin" && !currentUser?.systemAdmin) {
          return { ok: false, reason: "報酬を確定できるのは管理者です。" };
        }
        if (!monthHasEnded(year, month, clock.year, clock.month)) {
          return { ok: false, reason: "この月が終わってから確定できます。" };
        }
        if (findConfirmedMonth(confirmedMonths, year, month)) {
          return { ok: false, reason: "この月の報酬は、すでに確定しています。" };
        }
        const days = daysInMonth(year, month).map((date) => dayFrom(toDateKey(date), shifts));
        const snapshot = buildConfirmedMonth(
          year,
          month,
          clock.dateKey,
          days,
          members.filter((member) => !member.office),
          allowanceIdsForMonth(allowanceSchedule, year, month),
        );
        updateStore((current) => ({
          ...current,
          confirmedMonths: [
            ...current.confirmedMonths.filter((item) => item.year !== year || item.month !== month),
            snapshot,
          ],
        }));
        return success;
      },
      isMonthConfirmed(year, month) {
        return Boolean(findConfirmedMonth(confirmedMonths, year, month));
      },
      setMemberRole(memberId, role) {
        if (!currentUser?.systemAdmin) {
          return { ok: false, reason: "役割を変えられるのはシステム管理者です。" };
        }
        const target = memberById(memberId);
        if (!target) {
          return { ok: false, reason: "メンバーが見つかりません。" };
        }
        if (target.office) {
          return { ok: false, reason: "管理会社の担当は、管理者にできません。" };
        }
        if (role === "admin") {
          const adminCount = members.filter((member) => member.role === "admin").length;
          const alreadyAdmin = members.some(
            (member) => member.id === memberId && member.role === "admin",
          );
          if (!alreadyAdmin && adminCount >= ADMIN_LIMIT) {
            return {
              ok: false,
              reason: "管理者は2人までです。先にどちらかを住人に戻してください。",
            };
          }
        }
        updateStore((current) => {
          const nextRoles = { ...current.roles, [memberId]: role };
          const nextAdminIds = current.roster
            .filter((entry) => nextRoles[entry.id] === "admin")
            .map((entry) => entry.id);
          return {
            ...current,
            roles: nextRoles,
            allowanceSchedule: scheduleAllowanceFromNextMonth(
              current.allowanceSchedule,
              clock.year,
              clock.month,
              nextAdminIds,
            ),
          };
        });
        return success;
      },
      addMember(room, name) {
        if (!currentUser?.systemAdmin) {
          return { ok: false, reason: "住人を追加できるのはシステム管理者です。" };
        }
        const reason = profileError(
          { room, name, bankName: "", branchName: "", accountType: "", accountNumber: "", accountHolder: "" },
          roster,
        );
        if (reason) return { ok: false, reason };
        const id = `member-${crypto.randomUUID()}`;
        updateStore((current) => ({
          ...current,
          roster: [
            ...current.roster,
            {
              id,
              room: room.trim(),
              name: name.trim(),
              systemAdmin: false,
              office: false,
              bankName: "",
              branchName: "",
              accountType: "",
              accountNumber: "",
              accountHolder: "",
            },
          ],
          roles: { ...current.roles, [id]: "resident" },
        }));
        return success;
      },
      updateMember(memberId, edits) {
        if (!currentUser?.systemAdmin) {
          return { ok: false, reason: "住人を編集できるのはシステム管理者です。" };
        }
        if (!memberById(memberId)) {
          return { ok: false, reason: "メンバーが見つかりません。" };
        }
        const reason = profileError(edits, roster, memberId);
        if (reason) return { ok: false, reason };
        const accountNumber = edits.accountNumber.replace(/[\s-]/g, "");
        updateStore((current) => ({
          ...current,
          roster: current.roster.map((entry) =>
            entry.id === memberId
              ? {
                  ...entry,
                  room: edits.room.trim(),
                  name: edits.name.trim(),
                  bankName: edits.bankName.trim(),
                  branchName: edits.branchName.trim(),
                  accountType: edits.accountType,
                  accountNumber,
                  accountHolder: edits.accountHolder.trim(),
                }
              : entry,
          ),
        }));
        return success;
      },
      removeMember(memberId) {
        if (!currentUser?.systemAdmin) {
          return { ok: false, reason: "住人を削除できるのはシステム管理者です。" };
        }
        const member = memberById(memberId);
        if (!member) return { ok: false, reason: "メンバーが見つかりません。" };
        if (member.systemAdmin) return { ok: false, reason: "システム管理者は削除できません。" };
        if (member.office) return { ok: false, reason: "管理会社の担当は削除できません。" };
        updateStore((current) => {
          const roles = { ...current.roles };
          delete roles[memberId];
          return {
            ...current,
            roster: current.roster.filter((entry) => entry.id !== memberId),
            roles,
            allowanceSchedule: dropAllowanceMember(current.allowanceSchedule, memberId),
            shifts: dropAssignees(
              current.shifts,
              (id) => id === memberId,
              current.confirmedMonths,
            ),
          };
        });
        return success;
      },
      view,
      today,
      todayKey: clock.dateKey,
      login(passphrase, memberId) {
        if (passphrase.trim() !== PASSPHRASE) {
          return { ok: false, reason: "合言葉が違います。もう一度入力してください。" };
        }
        if (!memberById(memberId)) {
          return { ok: false, reason: "メンバーが見つかりません。" };
        }
        updateStore((current) => ({ ...current, currentUserId: memberId }));
        return success;
      },
      switchUser(memberId) {
        if (!memberById(memberId)) return;
        updateStore((current) => ({ ...current, currentUserId: memberId }));
      },
      shiftMonth(delta) {
        setPickedMonth(addMonths(view.year, view.month, delta));
      },
      goToThisMonth() {
        const now = new Date();
        setPickedMonth({ year: now.getFullYear(), month: now.getMonth() });
      },
      resetDemo() {
        updateStore((current) => {
          const ids = new Set(current.roster.map((entry) => entry.id));
          const seeded = dropAssignees(seedShifts(), (id) => !ids.has(id), current.confirmedMonths);
          for (const [dateKey, record] of Object.entries(current.shifts)) {
            const date = parseDateKey(dateKey);
            if (findConfirmedMonth(current.confirmedMonths, date.getFullYear(), date.getMonth())) {
              seeded[dateKey] = record;
            }
          }
          return { ...current, shifts: seeded };
        });
      },
      shiftsForMonth(year, month) {
        return daysInMonth(year, month).map((date) => dayFrom(toDateKey(date), shifts));
      },
      getShift,
      previousHandover(dateKey) {
        const previous = previousWorkDay(parseDateKey(dateKey));
        if (!previous) return null;
        const shift = dayFrom(toDateKey(previous), shifts);
        if (!shift.handover) return null;
        const names = shift.slots
          .map((slot) => memberById(slot.assigneeId))
          .filter((member) => member !== undefined)
          .map((member) => `${member.room} ${member.name}`)
          .join("、");
        return { label: formatLongDate(previous), text: shift.handover, names };
      },
      claim(dateKey, slotIndex) {
        const blocked = requireWorkDay(dateKey) ?? requireOpenMonth(dateKey);
        if (blocked) return blocked;
        if (!currentUser) return { ok: false, reason: "先に本人を選んでください。" };
        if (currentUser.office) {
          return { ok: false, reason: "管理会社の担当は、担当に入れません。" };
        }
        const day = dayFrom(dateKey, shifts);
        if (day.slots.some((slot) => slot.assigneeId === currentUser.id)) {
          return { ok: false, reason: "この日は、すでに担当に入っています。" };
        }
        const slot = day.slots[slotIndex];
        if (!slot || (slot.assigneeId && !slot.seekingReplacement)) {
          return { ok: false, reason: "この枠はすでに埋まっています。" };
        }
        replaceShift(dateKey, (record) => ({
          ...record,
          slots: record.slots.map((item, index) =>
            index === slotIndex
              ? { assigneeId: currentUser.id, seekingReplacement: false }
              : item,
          ),
        }));
        return success;
      },
      toggleReplacement(dateKey, slotIndex) {
        const blocked = requireWorkDay(dateKey) ?? requireOpenMonth(dateKey);
        if (blocked) return blocked;
        if (!currentUser) return { ok: false, reason: "先に本人を選んでください。" };
        const slot = dayFrom(dateKey, shifts).slots[slotIndex];
        if (!slot || slot.assigneeId !== currentUser.id) {
          return { ok: false, reason: "自分の担当だけ、交代を募集できます。" };
        }
        replaceShift(dateKey, (record) => ({
          ...record,
          slots: record.slots.map((item, index) =>
            index === slotIndex
              ? { ...item, seekingReplacement: !item.seekingReplacement }
              : item,
          ),
        }));
        return success;
      },
      setHandover(dateKey, text) {
        const blocked = requireWorkDay(dateKey) ?? requireOpenMonth(dateKey);
        if (blocked) return blocked;
        if (!currentUser) return { ok: false, reason: "先に本人を選んでください。" };
        const mine = dayFrom(dateKey, shifts).slots.some(
          (slot) => slot.assigneeId === currentUser.id,
        );
        if (!mine) {
          return { ok: false, reason: "担当が決まっている日だけ、申し送りを書けます。" };
        }
        replaceShift(dateKey, (record) => ({ ...record, handover: text.trim() }));
        return success;
      },
      setNote(dateKey, text) {
        const blocked = requireWorkDay(dateKey) ?? requireOpenMonth(dateKey);
        if (blocked) return blocked;
        if (currentUser?.role !== "admin") {
          return { ok: false, reason: "備考を直せるのは管理者です。" };
        }
        replaceShift(dateKey, (record) => ({ ...record, note: text.trim() }));
        return success;
      },
      setCapacity(dateKey, capacity) {
        const blocked = requireWorkDay(dateKey) ?? requireOpenMonth(dateKey);
        if (blocked) return blocked;
        if (currentUser?.role !== "admin") {
          return { ok: false, reason: "人数を変えられるのは管理者です。" };
        }
        const day = dayFrom(dateKey, shifts);
        if (capacity === 1 && day.slots[1]?.assigneeId) {
          return {
            ok: false,
            reason: "2枠目に担当者がいるため、1名には戻せません。先に空き枠にしてください。",
          };
        }
        replaceShift(dateKey, (record) => {
          if (capacity === 2) {
            return {
              ...record,
              capacity: 2,
              slots:
                record.slots.length >= 2
                  ? record.slots.slice(0, 2)
                  : [...record.slots, { assigneeId: null, seekingReplacement: false }],
            };
          }
          return {
            ...record,
            capacity: 1,
            slots: [record.slots[0] ?? { assigneeId: null, seekingReplacement: false }],
          };
        });
        return success;
      },
      assign(dateKey, slotIndex, memberId) {
        const blocked = requireWorkDay(dateKey) ?? requireOpenMonth(dateKey);
        if (blocked) return blocked;
        if (currentUser?.role !== "admin") {
          return { ok: false, reason: "代理で入れられるのは管理者です。" };
        }
        const day = dayFrom(dateKey, shifts);
        if (!day.slots[slotIndex]) return { ok: false, reason: "その枠はありません。" };
        if (memberId && memberById(memberId)?.office) {
          return { ok: false, reason: "管理会社の担当は、担当に入れません。" };
        }
        if (
          memberId &&
          day.slots.some((slot, index) => index !== slotIndex && slot.assigneeId === memberId)
        ) {
          return { ok: false, reason: "同じ人を、同じ日の2枠に入れることはできません。" };
        }
        replaceShift(dateKey, (record) => ({
          ...record,
          slots: record.slots.map((slot, index) =>
            index === slotIndex ? { assigneeId: memberId, seekingReplacement: false } : slot,
          ),
        }));
        return success;
      },
    };
  }, [
    allowanceSchedule,
    confirmedMonths,
    clock.dateKey,
    clock.month,
    clock.year,
    currentUserId,
    getShift,
    ready,
    replaceShift,
    roles,
    roster,
    shifts,
    today,
    view,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp は AppProvider の内側で使ってください。");
  return context;
}
