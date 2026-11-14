import type { GarbageType, ShiftRecord, ShiftSlot } from "@/lib/types";

export const BASE_REWARD = 5000;
export const SPECIAL_ALLOWANCE = 1000;

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"] as const;

export function toDateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function parseDateKey(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function weekdayLabel(date: Date): string {
  return WEEKDAYS[date.getDay()];
}

export function formatLongDate(date: Date): string {
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日（${weekdayLabel(date)}）`;
}

export function formatMonthDay(date: Date): string {
  return `${date.getMonth() + 1}月${date.getDate()}日（${weekdayLabel(date)}）`;
}

export function monthTitle(year: number, month: number): string {
  return `${year}年${month + 1}月`;
}

export function addMonths(
  year: number,
  month: number,
  delta: number,
): { year: number; month: number } {
  const next = new Date(year, month + delta, 1);
  return { year: next.getFullYear(), month: next.getMonth() };
}

export function daysInMonth(year: number, month: number): Date[] {
  const count = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: count }, (_, index) => new Date(year, month, index + 1));
}

/** 第n火曜は Math.ceil(date / 7)。第4火曜だけ燃えないごみ、第5火曜はリサイクル。 */
export function garbageTypeOf(date: Date): GarbageType {
  const weekday = date.getDay();
  if (weekday === 0 || weekday === 1) return "off";
  if (weekday === 2) {
    const nth = Math.ceil(date.getDate() / 7);
    return nth === 4 ? "nonburnable" : "recycle";
  }
  if (weekday === 3 || weekday === 6) return "burnable";
  if (weekday === 4) return "plastic";
  if (weekday === 5) return "pet";
  return "off";
}

export function previousWorkDay(date: Date): Date | null {
  const cursor = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  for (let i = 0; i < 10; i += 1) {
    cursor.setDate(cursor.getDate() - 1);
    if (garbageTypeOf(cursor) !== "off") {
      return new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate());
    }
  }
  return null;
}

export const GARBAGE_META: Record<
  GarbageType,
  { label: string; short: string; detail: string; badgeClass: string }
> = {
  burnable: {
    label: "燃えるゴミ",
    short: "燃える",
    detail: "燃えるごみの日です",
    badgeClass: "bg-red-100 text-red-950 ring-red-300",
  },
  plastic: {
    label: "プラスチックごみ",
    short: "プラ",
    detail: "プラスチックごみの日です",
    badgeClass: "bg-emerald-100 text-emerald-950 ring-emerald-400",
  },
  pet: {
    label: "ペットボトル",
    short: "ペット",
    detail: "ペットボトルの日です",
    badgeClass: "bg-sky-100 text-sky-950 ring-sky-300",
  },
  recycle: {
    label: "リサイクルゴミ",
    short: "リサイクル",
    detail: "紙・缶・ビン・布の日です",
    badgeClass: "bg-amber-100 text-amber-950 ring-amber-300",
  },
  nonburnable: {
    label: "燃えないごみ",
    short: "不燃",
    detail: "燃えないごみの日です",
    badgeClass: "bg-violet-100 text-violet-950 ring-violet-300",
  },
  off: {
    label: "お休み",
    short: "お休み",
    detail: "日曜・月曜はシフトがありません",
    badgeClass: "bg-stone-200 text-stone-700 ring-stone-300",
  },
};

export function emptySlot(): ShiftSlot {
  return { assigneeId: null, seekingReplacement: false };
}

export function defaultRecord(): ShiftRecord {
  return {
    capacity: 1,
    specialAllowance: false,
    note: "",
    handover: "",
    slots: [emptySlot()],
  };
}

export function normalizeRecord(record: ShiftRecord): ShiftRecord {
  const capacity: 1 | 2 = record.capacity === 2 ? 2 : 1;
  const source = Array.isArray(record.slots) ? record.slots : [];
  const slots: ShiftSlot[] = [];
  for (let index = 0; index < capacity; index += 1) {
    const slot = source[index];
    const assigneeId = slot?.assigneeId ?? null;
    slots.push({
      assigneeId,
      seekingReplacement: Boolean(assigneeId && slot?.seekingReplacement),
    });
  }
  return {
    capacity,
    specialAllowance: Boolean(record.specialAllowance),
    note: record.note?.trim() ?? "",
    handover: record.handover?.trim() ?? "",
    slots,
  };
}

export function rewardOf(specialAllowance: boolean): number {
  return BASE_REWARD + (specialAllowance ? SPECIAL_ALLOWANCE : 0);
}

export function formatYen(amount: number): string {
  return `${amount.toLocaleString("ja-JP")}円`;
}

export function rewardLabel(specialAllowance: boolean): string {
  if (specialAllowance) {
    return `${formatYen(rewardOf(true))}（特別手当 +1,000円込）`;
  }
  return formatYen(BASE_REWARD);
}
