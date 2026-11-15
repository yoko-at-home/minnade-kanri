"use client";

import { MonthSwitcher } from "@/components/MonthSwitcher";
import { useApp } from "@/context/AppContext";
import { accountHint, allowanceIdsForMonth, displayName, memberLabel } from "@/lib/members";
import { formatYen } from "@/lib/schedule";
import { summarizeMonth, summaryCsv, summaryCsvFilename, type MonthSummary } from "@/lib/summary";
import type { Member } from "@/lib/types";

export function SummaryView() {
  const { currentUser, members, view, shiftsForMonth, allowanceSchedule } = useApp();
  const summary = summarizeMonth(
    shiftsForMonth(view.year, view.month),
    currentUser?.id ?? null,
    members,
    allowanceIdsForMonth(allowanceSchedule, view.year, view.month),
  );
  const mine = summary.members.find((item) => item.memberId === currentUser?.id);
  const myPay = mine?.pay ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <MonthSwitcher />
      <p className="text-base leading-relaxed text-stone-700">
        担当1回につき5,000円です。特別手当の日は6,000円になります。管理者には、毎月1万円の管理者手当が上乗せされます。
      </p>
      <button
        type="button"
        className="min-h-14 rounded-2xl border-2 border-[#1d4e89] bg-white text-lg font-bold text-[#1d4e89]"
        onClick={() => downloadSummary(view.year, view.month, summary, members)}
      >
        この月の報酬をCSVでダウンロード
      </button>

      <section className="grid grid-cols-2 gap-3">
        <Stat label="稼働枠" value={`${summary.totalSlots}枠`} />
        <Stat label="確定" value={`${summary.filledSlots}枠`} />
        <Stat label="空き枠" value={`${summary.openSlots}枠`} />
        <Stat label="交代募集" value={`${summary.seekingSlots}枠`} />
      </section>

      <section className="rounded-2xl border border-[#e4d9c8] bg-white p-4">
        <h2 className="text-base font-bold text-stone-700">
          確定した報酬の合計
        </h2>
        <p className="mt-1 text-3xl font-bold text-[#1d4e89]">
          {formatYen(summary.confirmedPay)}
        </p>
        <p className="mt-3 text-base leading-relaxed text-stone-800">
          空き枠もすべて埋まった場合は {formatYen(summary.potentialPay)} です。
        </p>
      </section>

      <section className="rounded-3xl bg-[#1f6a45] p-5 text-white">
        <h2 className="text-lg font-bold">
          もし、空いている枠をあなたが担当すると
        </h2>
        {summary.simulation.extraCount === 0 ? (
          <p className="mt-3 text-lg leading-relaxed">
            いま申し込める空き枠はありません。
          </p>
        ) : (
          <>
            <p className="mt-2 text-3xl font-bold">
              +{formatYen(summary.simulation.extraPay)}
            </p>
            <p className="mt-2 text-lg leading-relaxed">
              追加で{summary.simulation.extraCount}回です。今の報酬{" "}
              {formatYen(myPay)} が{" "}
              {formatYen(myPay + summary.simulation.extraPay)} になります。
            </p>
            {summary.simulation.swapCount > 0 ? (
              <p className="mt-2 text-base leading-relaxed text-emerald-50">
                うち{summary.simulation.swapCount}
                回は、交代募集を引き受ける分です。
              </p>
            ) : null}
          </>
        )}
        {currentUser ? (
          <p className="mt-3 text-base text-emerald-50">
            {memberLabel(currentUser)} として計算
          </p>
        ) : null}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-bold text-stone-950">部屋ごとの報酬</h2>
        {members.map((member) => {
          const row = summary.members.find(
            (item) => item.memberId === member.id
          ) ?? {
            count: 0,
            specialCount: 0,
            adminAllowance: 0,
            pay: 0,
          };
          const isMe = member.id === currentUser?.id;
          const hint = accountHint(member);
          return (
            <article
              key={member.id}
              className={`rounded-2xl border-2 p-4 ${
                isMe
                  ? "border-[#1f6a45] bg-emerald-50"
                  : "border-[#e4d9c8] bg-white"
              }`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="shrink-0 text-lg font-bold text-stone-950">
                  {displayName(member)}
                  {member.role === "admin" ? "（管理者）" : ""}
                  {isMe ? "（あなた）" : ""}
                </h3>
                {hint ? (
                  <p className="min-w-0 text-right text-sm text-stone-400">
                    {hint}
                  </p>
                ) : null}
              </div>
              <p className="mt-1 text-base text-stone-800">
                担当 {row.count}回
                {row.specialCount > 0
                  ? `（うち特別手当 ${row.specialCount}回）`
                  : ""}
              </p>
              {member.role === "admin" && row.adminAllowance === 0 ? (
                <p className="mt-1 text-base text-stone-800">管理者手当は翌月から付きます。</p>
              ) : null}
              {row.adminAllowance > 0 ? (
                <p className="mt-1 text-lg font-bold leading-relaxed text-[#1d4e89]">
                  {`${formatYen(row.pay - row.adminAllowance)} + ${formatYen(
                    row.adminAllowance
                  )} (管理者手当) `}
                </p>
              ) : (
                <p className="mt-1 text-lg font-bold text-[#1d4e89]">
                  {formatYen(row.pay)}
                </p>
              )}
            </article>
          );
        })}
      </section>
    </div>
  );
}

function downloadSummary(year: number, month: number, summary: MonthSummary, members: Member[]) {
  const csv = `\uFEFF${summaryCsv(year, month, summary, members)}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = summaryCsvFilename(year, month);
  link.click();
  URL.revokeObjectURL(url);
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#e4d9c8] bg-white px-4 py-3">
      <p className="text-base text-stone-700">{label}</p>
      <p className="text-2xl font-bold text-stone-950">{value}</p>
    </div>
  );
}
