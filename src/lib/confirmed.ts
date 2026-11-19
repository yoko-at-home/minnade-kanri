import { summarizeMonth, type MonthSummary } from "@/lib/summary";
import type { ConfirmedMonth, ConfirmedRewardRow, Member, ShiftDay } from "@/lib/types";

export function monthHasEnded(
  year: number,
  month: number,
  todayYear: number,
  todayMonth: number,
): boolean {
  return year < todayYear || (year === todayYear && month < todayMonth);
}

export function findConfirmedMonth(
  months: readonly ConfirmedMonth[],
  year: number,
  month: number,
): ConfirmedMonth | undefined {
  return months.find((item) => item.year === year && item.month === month);
}

export function normalizeConfirmedMonths(value: unknown): ConfirmedMonth[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isConfirmedMonth);
}

export function buildConfirmedMonth(
  year: number,
  month: number,
  confirmedOn: string,
  days: ShiftDay[],
  members: Member[],
  allowanceIds: ReadonlySet<string>,
): ConfirmedMonth {
  const summary = summarizeMonth(days, null, members, allowanceIds);
  const rows = members.map((member) => {
    const row = summary.members.find((item) => item.memberId === member.id);
    return {
      memberId: member.id,
      room: member.room,
      name: member.name,
      count: row?.count ?? 0,
      adminAllowance: row?.adminAllowance ?? 0,
      pay: row?.pay ?? 0,
      bankName: member.bankName,
      branchName: member.branchName,
      accountType: member.accountType,
      accountNumber: member.accountNumber,
      accountHolder: member.accountHolder,
      adminAtConfirm: member.role === "admin",
    } satisfies ConfirmedRewardRow;
  });
  return {
    year,
    month,
    confirmedOn,
    rows,
    totalSlots: summary.totalSlots,
    filledSlots: summary.filledSlots,
    openSlots: summary.openSlots,
    seekingSlots: summary.seekingSlots,
    confirmedPay: summary.confirmedPay,
    potentialPay: summary.potentialPay,
  };
}

export function summaryFromConfirmed(confirmed: ConfirmedMonth): MonthSummary {
  return {
    totalSlots: confirmed.totalSlots,
    filledSlots: confirmed.filledSlots,
    openSlots: confirmed.openSlots,
    seekingSlots: confirmed.seekingSlots,
    confirmedPay: confirmed.confirmedPay,
    potentialPay: confirmed.potentialPay,
    members: confirmed.rows.map((row) => ({
      memberId: row.memberId,
      count: row.count,
      adminAllowance: row.adminAllowance,
      pay: row.pay,
    })),
    simulation: { extraPay: 0, extraCount: 0, swapCount: 0 },
  };
}

export function membersFromConfirmed(confirmed: ConfirmedMonth): Member[] {
  return confirmed.rows.map((row) => ({
    id: row.memberId,
    room: row.room,
    name: row.name,
    systemAdmin: false,
    office: false,
    role: row.adminAtConfirm ? "admin" : "resident",
    bankName: row.bankName,
    branchName: row.branchName,
    accountType: row.accountType,
    accountNumber: row.accountNumber,
    accountHolder: row.accountHolder,
  }));
}

function isConfirmedMonth(value: unknown): value is ConfirmedMonth {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<ConfirmedMonth>;
  return (
    Number.isInteger(record.year) &&
    Number.isInteger(record.month) &&
    typeof record.confirmedOn === "string" &&
    Array.isArray(record.rows) &&
    typeof record.confirmedPay === "number"
  );
}
