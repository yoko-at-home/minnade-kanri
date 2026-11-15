import { accountTypeLabel } from "@/lib/members";
import { ADMIN_ALLOWANCE, monthTitle, rewardOf } from "@/lib/schedule";
import type { Member, ShiftDay } from "@/lib/types";

export type MemberSummary = {
  memberId: string;
  count: number;
  specialCount: number;
  adminAllowance: number;
  pay: number;
};

export type MonthSummary = {
  totalSlots: number;
  filledSlots: number;
  openSlots: number;
  seekingSlots: number;
  confirmedPay: number;
  potentialPay: number;
  members: MemberSummary[];
  simulation: {
    extraPay: number;
    extraCount: number;
    swapCount: number;
  };
};

export function summarizeMonth(
  days: ShiftDay[],
  userId: string | null,
  members: Member[],
  allowanceIds: ReadonlySet<string>,
): MonthSummary {
  const workDays = days.filter((day) => day.garbageType !== "off");
  const totals = new Map<string, MemberSummary>();

  let totalSlots = 0;
  let filledSlots = 0;
  let openSlots = 0;
  let seekingSlots = 0;
  let confirmedPay = 0;
  let potentialPay = 0;
  let extraPay = 0;
  let extraCount = 0;
  let swapCount = 0;

  for (const day of workDays) {
    const unit = rewardOf(day.specialAllowance);
    const alreadyMine = Boolean(
      userId && day.slots.some((slot) => slot.assigneeId === userId),
    );
    let emptyForMe = 0;
    let swapForMe = 0;

    for (const slot of day.slots) {
      totalSlots += 1;
      potentialPay += unit;
      if (slot.seekingReplacement) seekingSlots += 1;
      if (slot.assigneeId) {
        filledSlots += 1;
        confirmedPay += unit;
        const current = totals.get(slot.assigneeId) ?? {
          memberId: slot.assigneeId,
          count: 0,
          specialCount: 0,
          adminAllowance: 0,
          pay: 0,
        };
        current.count += 1;
        if (day.specialAllowance) current.specialCount += 1;
        current.pay += unit;
        totals.set(slot.assigneeId, current);
        if (
          userId &&
          slot.seekingReplacement &&
          slot.assigneeId !== userId
        ) {
          swapForMe += 1;
        }
      } else {
        openSlots += 1;
        emptyForMe += 1;
      }
    }

    if (userId && !alreadyMine) {
      if (emptyForMe > 0) {
        extraCount += 1;
        extraPay += unit;
      } else if (swapForMe > 0) {
        extraCount += 1;
        swapCount += 1;
        extraPay += unit;
      }
    }
  }

  const listed = members.map((member) => {
    const row = totals.get(member.id);
    const adminAllowance = allowanceIds.has(member.id) ? ADMIN_ALLOWANCE : 0;
    return {
      memberId: member.id,
      count: row?.count ?? 0,
      specialCount: row?.specialCount ?? 0,
      adminAllowance,
      pay: (row?.pay ?? 0) + adminAllowance,
    };
  });
  const allowanceTotal = listed.reduce((sum, row) => sum + row.adminAllowance, 0);

  return {
    totalSlots,
    filledSlots,
    openSlots,
    seekingSlots,
    confirmedPay: confirmedPay + allowanceTotal,
    potentialPay: potentialPay + allowanceTotal,
    members: listed,
    simulation: { extraPay, extraCount, swapCount },
  };
}

function csvCell(value: string): string {
  if (/[",\r\n]/.test(value)) return `"${value.replaceAll('"', '""')}"`;
  return value;
}

/** 先頭が0の口座番号を、Excelが数字として消さないようにする。 */
function csvAccountNumber(value: string): string {
  if (value.startsWith("0")) return `="${value}"`;
  return value;
}

/** 表示中の月の部屋ごと報酬。Excelで開けるよう、呼び出し側でBOMを付ける。 */
export function summaryCsv(
  year: number,
  month: number,
  summary: MonthSummary,
  members: Member[],
): string {
  const rows = members.map((member) => {
    const row = summary.members.find((item) => item.memberId === member.id);
    return [
      member.room,
      member.name,
      String(row?.count ?? 0),
      String(row?.specialCount ?? 0),
      String(row?.adminAllowance ?? 0),
      String(row?.pay ?? 0),
      member.bankName,
      member.branchName,
      accountTypeLabel(member.accountType),
      csvAccountNumber(member.accountNumber),
      member.accountHolder,
    ];
  });
  const count = rows.reduce((sum, row) => sum + Number(row[2]), 0);
  const specialCount = rows.reduce((sum, row) => sum + Number(row[3]), 0);
  const allowanceTotal = rows.reduce((sum, row) => sum + Number(row[4]), 0);
  const lines = [
    ["対象月", monthTitle(year, month), "", "", "", "", "", "", "", "", ""],
    ["部屋", "名前", "担当回数", "特別手当回数", "管理者手当", "報酬", "銀行名", "支店名", "口座種別", "口座番号", "口座名義"],
    ...rows,
    ["合計", "", String(count), String(specialCount), String(allowanceTotal), String(summary.confirmedPay), "", "", "", "", ""],
  ];
  return lines.map((line) => line.map(csvCell).join(",")).join("\r\n");
}

export function summaryCsvFilename(year: number, month: number): string {
  const monthNumber = String(month + 1).padStart(2, "0");
  return `報酬集計-${year}-${monthNumber}.csv`;
}
