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
import { membersFrom, PASSPHRASE, profileError } from "@/lib/members";
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
import type { ActionResult, Member, Role, ShiftDay, ShiftRecord } from "@/lib/types";

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
  updateMember: (memberId: string, room: string, name: string) => ActionResult;
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
  setSpecial: (dateKey: string, enabled: boolean) => ActionResult;
  setCapacity: (dateKey: string, capacity: 1 | 2) => ActionResult;
  assign: (
    dateKey: string,
    slotIndex: number,
    memberId: string | null,
  ) => ActionResult;
};

const AppContext = createContext<AppContextValue | null>(null);
const success: ActionResult = { ok: true };

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
  const { currentUserId, roster, roles, shifts } = stored;
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

    return {
      ready,
      currentUser,
      members,
      setMemberRole(memberId, role) {
        if (!currentUser?.systemAdmin) {
          return { ok: false, reason: "役割を変えられるのはシステム管理者です。" };
        }
        if (!memberById(memberId)) {
          return { ok: false, reason: "メンバーが見つかりません。" };
        }
        updateStore((current) => ({
          ...current,
          roles: { ...current.roles, [memberId]: role },
        }));
        return success;
      },
      addMember(room, name) {
        if (!currentUser?.systemAdmin) {
          return { ok: false, reason: "住人を追加できるのはシステム管理者です。" };
        }
        const reason = profileError(room, name, roster);
        if (reason) return { ok: false, reason };
        const id = `member-${crypto.randomUUID()}`;
        updateStore((current) => ({
          ...current,
          roster: [
            ...current.roster,
            { id, room: room.trim(), name: name.trim(), systemAdmin: false },
          ],
          roles: { ...current.roles, [id]: "resident" },
        }));
        return success;
      },
      updateMember(memberId, room, name) {
        if (!currentUser?.systemAdmin) {
          return { ok: false, reason: "住人を編集できるのはシステム管理者です。" };
        }
        if (!memberById(memberId)) {
          return { ok: false, reason: "メンバーが見つかりません。" };
        }
        const reason = profileError(room, name, roster, memberId);
        if (reason) return { ok: false, reason };
        const roomText = room.trim();
        const nameText = name.trim();
        updateStore((current) => ({
          ...current,
          roster: current.roster.map((entry) =>
            entry.id === memberId ? { ...entry, room: roomText, name: nameText } : entry,
          ),
        }));
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
        updateStore((current) => ({ ...current, shifts: seedShifts() }));
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
        const blocked = requireWorkDay(dateKey);
        if (blocked) return blocked;
        if (!currentUser) return { ok: false, reason: "先に本人を選んでください。" };
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
        const blocked = requireWorkDay(dateKey);
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
        const blocked = requireWorkDay(dateKey);
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
        const blocked = requireWorkDay(dateKey);
        if (blocked) return blocked;
        if (currentUser?.role !== "admin") {
          return { ok: false, reason: "備考を直せるのは管理者です。" };
        }
        replaceShift(dateKey, (record) => ({ ...record, note: text.trim() }));
        return success;
      },
      setSpecial(dateKey, enabled) {
        const blocked = requireWorkDay(dateKey);
        if (blocked) return blocked;
        if (currentUser?.role !== "admin") {
          return { ok: false, reason: "特別手当を切り替えられるのは管理者です。" };
        }
        replaceShift(dateKey, (record) => ({ ...record, specialAllowance: enabled }));
        return success;
      },
      setCapacity(dateKey, capacity) {
        const blocked = requireWorkDay(dateKey);
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
        const blocked = requireWorkDay(dateKey);
        if (blocked) return blocked;
        if (currentUser?.role !== "admin") {
          return { ok: false, reason: "代理で入れられるのは管理者です。" };
        }
        const day = dayFrom(dateKey, shifts);
        if (!day.slots[slotIndex]) return { ok: false, reason: "その枠はありません。" };
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
  }, [clock.dateKey, currentUserId, getShift, ready, replaceShift, roles, roster, shifts, today, view]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp は AppProvider の内側で使ってください。");
  return context;
}
