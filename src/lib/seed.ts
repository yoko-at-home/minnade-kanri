import type { ShiftRecord } from "@/lib/types";
import { daysInMonth, defaultRecord, garbageTypeOf, toDateKey } from "@/lib/schedule";

function workDays(year: number, month: number): Date[] {
  return daysInMonth(year, month).filter((date) => garbageTypeOf(date) !== "off");
}

function assigned(
  memberId: string,
  extra: Partial<Omit<ShiftRecord, "slots">> = {},
): ShiftRecord {
  return {
    ...defaultRecord(),
    ...extra,
    slots: [{ assigneeId: memberId, seekingReplacement: false }],
  };
}

function put(
  shifts: Record<string, ShiftRecord>,
  date: Date | undefined,
  record: ShiftRecord,
) {
  if (!date) return;
  shifts[toDateKey(date)] = record;
}

function nthWeekday(days: Date[], weekday: number, skip: number): Date | undefined {
  return days.filter((date) => date.getDay() === weekday)[skip];
}

function seedCurrentMonth(shifts: Record<string, ShiftRecord>, days: Date[]) {
  put(
    shifts,
    nthWeekday(days, 3, 0),
    assigned("iwasaki", { handover: "雨のため外掃除スキップしました" }),
  );
  put(shifts, nthWeekday(days, 4, 0), assigned("morimoto"));
  put(shifts, nthWeekday(days, 6, 0), assigned("funamoto"));
  put(
    shifts,
    nthWeekday(days, 2, 1),
    assigned("iwasaki", {
      specialAllowance: true,
      note: "10:00〜 消火栓点検の立ち会いあり",
    }),
  );
  put(shifts, nthWeekday(days, 6, 1), {
    ...defaultRecord(),
    slots: [{ assigneeId: "matsuura", seekingReplacement: true }],
  });
  put(shifts, nthWeekday(days, 3, 2), {
    capacity: 2,
    specialAllowance: true,
    note: "台風翌日のため、外回りを2名でお願いします",
    handover: "",
    slots: [
      { assigneeId: "funamoto", seekingReplacement: false },
      { assigneeId: null, seekingReplacement: false },
    ],
  });
}

function seedNextMonth(shifts: Record<string, ShiftRecord>, days: Date[]) {
  put(shifts, nthWeekday(days, 3, 0), assigned("morimoto"));
  put(shifts, nthWeekday(days, 5, 0), assigned("matsuura"));
  put(shifts, nthWeekday(days, 2, 2), {
    ...defaultRecord(),
    specialAllowance: true,
    note: "植栽の伐採立ち会い（午前）",
  });
  put(shifts, nthWeekday(days, 6, 1), {
    capacity: 2,
    specialAllowance: false,
    note: "大掃除のため2名募集",
    handover: "",
    slots: [
      { assigneeId: "iwasaki", seekingReplacement: false },
      { assigneeId: null, seekingReplacement: false },
    ],
  });
}

/** 今月と来月だけ、意見聴取デモ用の予約・備考を入れる。 */
export function seedShifts(today = new Date()): Record<string, ShiftRecord> {
  const shifts: Record<string, ShiftRecord> = {};
  const cursor = new Date(today.getFullYear(), today.getMonth(), 1);
  for (let index = 0; index < 2; index += 1) {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const days = workDays(year, month);
    if (index === 0) seedCurrentMonth(shifts, days);
    else seedNextMonth(shifts, days);
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return shifts;
}
