"use client";

import { useState } from "react";
import { MonthGrid } from "@/components/MonthGrid";
import { MonthSwitcher } from "@/components/MonthSwitcher";
import { useApp } from "@/context/AppContext";
import {
  findConfirmedMonth,
  membersFromConfirmed,
  monthHasEnded,
  summaryFromConfirmed,
} from "@/lib/confirmed";
import { accountHint, allowanceIdsForMonth, displayName } from "@/lib/members";
import { formatLongDate, formatYen, monthTitle, parseDateKey } from "@/lib/schedule";
import { summarizeMonth, summaryCsv, summaryCsvFilename, type MonthSummary } from "@/lib/summary";
import type { Member } from "@/lib/types";

export function SummaryView() {
  const {
    currentUser,
    members,
    view,
    today,
    todayKey,
    shiftsForMonth,
    allowanceSchedule,
    confirmedMonths,
    confirmMonth,
  } = useApp();
  const monthDays = shiftsForMonth(view.year, view.month);
  const confirmed = findConfirmedMonth(confirmedMonths, view.year, view.month);
  const liveSummary = summarizeMonth(
    monthDays,
    currentUser?.id ?? null,
    members.filter((member) => !member.office),
    allowanceIdsForMonth(allowanceSchedule, view.year, view.month),
  );
  const summary = confirmed ? summaryFromConfirmed(confirmed) : liveSummary;
  const office = Boolean(currentUser?.office);
  const seesEveryone = currentUser?.role === "admin" || Boolean(currentUser?.systemAdmin);
  const canExportAll = seesEveryone || office;
  const payees = (confirmed ? membersFromConfirmed(confirmed) : members).filter(
    (member) => !member.office,
  );
  const exportMembers = canExportAll
    ? payees
    : payees.filter((member) => member.id === currentUser?.id);
  const listed = seesEveryone
    ? payees
    : payees.filter((member) => member.id === currentUser?.id);
  const monthEnded = monthHasEnded(view.year, view.month, today.year, today.month);

  return (
    <div className="flex flex-col gap-4">
      <MonthSwitcher />
      <p className="text-base leading-relaxed text-stone-700">
        {office
          ? "この月の報酬をCSVで保存できます。担当の変更はできません。"
          : seesEveryone
            ? "担当1回につき5,000円です。管理者には、ひとり毎月5,000円の管理者手当が上乗せされます。"
            : "担当1回につき5,000円です。"}
      </p>
      <button
        type="button"
        className="min-h-14 rounded-2xl border-2 border-[#b7cbe4] bg-white text-lg font-bold text-[#4a6890]"
        onClick={() =>
          downloadSummary(
            view.year,
            view.month,
            summary,
            exportMembers,
            canExportAll ? undefined : currentUser?.room,
          )
        }
      >
        {canExportAll
          ? "この月の全員の報酬をCSVでダウンロード"
          : "この月の自分の報酬をCSVでダウンロード"}
      </button>
      <p className="text-base leading-relaxed text-stone-700">
        {office
          ? "管理会社は、全員の振込先が入ったファイルを保存します。"
          : seesEveryone
            ? "管理者とシステム管理者は、全員の振込先が入ったファイルを保存します。"
            : "住人は、自分の行だけを保存します。ほかの人の振込先は入りません。"}
      </p>
      {office ? null : seesEveryone ? (
        <ConfirmReward
          key={`${view.year}-${view.month}`}
          ended={monthEnded}
          confirmedOn={confirmed?.confirmedOn}
          title={monthTitle(view.year, view.month)}
          onConfirm={() => confirmMonth(view.year, view.month)}
        />
      ) : confirmed ? (
        <p className="text-base leading-relaxed text-stone-700">
          この月の報酬は確定しています。担当は変更できません。
        </p>
      ) : null}

      {office || !seesEveryone ? null : (
        <>
          <section className="grid grid-cols-2 gap-3">
            <Stat label="稼働枠" value={`${summary.totalSlots}枠`} />
            <Stat label="確定" value={`${summary.filledSlots}枠`} />
            <Stat label="空き枠" value={`${summary.openSlots}枠`} />
            <Stat label="交代募集" value={`${summary.seekingSlots}枠`} />
          </section>
          <section className="rounded-2xl border border-[#efe3d4] bg-white p-4">
            <h2 className="text-base font-bold text-stone-700">確定した報酬の合計</h2>
            <p className="mt-1 text-3xl font-bold text-[#4a6890]">
              {formatYen(summary.confirmedPay)}
            </p>
            <p className="mt-3 text-base leading-relaxed text-stone-800">
              空き枠もすべて埋まった場合は {formatYen(summary.potentialPay)} です。
            </p>
          </section>
        </>
      )}

      {office ? null : (
      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-bold text-stone-950">
          {seesEveryone ? "部屋ごとの報酬" : "あなたの報酬"}
        </h2>
        {listed.map((member) => {
          const row = summary.members.find((item) => item.memberId === member.id) ?? {
            count: 0,
            adminAllowance: 0,
            pay: 0,
          };
          const isMe = member.id === currentUser?.id;
          const hint = accountHint(member);
          return (
            <article
              key={member.id}
              className={`rounded-2xl border-2 p-4 ${
                isMe ? "border-[#a9d4c2] bg-[#eef8f3]" : "border-[#efe3d4] bg-white"
              }`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="shrink-0 text-lg font-bold text-stone-950">
                  {displayName(member)}
                  {member.role === "admin" ? "（管理者）" : ""}
                  {seesEveryone && isMe ? "（あなた）" : ""}
                </h3>
                {hint ? (
                  <p className="min-w-0 text-right text-sm text-stone-400">{hint}</p>
                ) : null}
              </div>
              <p className="mt-1 text-base text-stone-800">担当 {row.count}回</p>
              {member.role === "admin" && row.adminAllowance === 0 ? (
                <p className="mt-1 text-base text-stone-800">管理者手当は翌月から付きます。</p>
              ) : null}
              {row.adminAllowance > 0 ? (
                <p className="mt-1 text-lg font-bold leading-relaxed text-[#4a6890]">
                  {`${formatYen(row.pay - row.adminAllowance)} + ${formatYen(row.adminAllowance)} (管理者手当) `}
                </p>
              ) : (
                <p className="mt-1 text-lg font-bold text-[#4a6890]">{formatYen(row.pay)}</p>
              )}
            </article>
          );
        })}
      </section>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-xl font-bold text-stone-950">この月の担当</h2>
        <p className="text-base leading-relaxed text-stone-700">
          {office
            ? "名前は、その日の担当です。空き枠はグレーです。"
            : "黄色は、あなたの担当です。ほかの担当日は名前だけです。空き枠はグレーです。"}
        </p>
        <MonthGrid
          days={monthDays}
          todayKey={todayKey}
          members={members.filter((member) => !member.office)}
          variant="summary"
          highlightUserId={office ? undefined : currentUser?.id}
        />
      </section>
    </div>
  );
}

function ConfirmReward({
  ended,
  confirmedOn,
  title,
  onConfirm,
}: {
  ended: boolean;
  confirmedOn?: string;
  title: string;
  onConfirm: () => { ok: true } | { ok: false; reason: string };
}) {
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState("");

  if (confirmedOn) {
    return (
      <p className="rounded-2xl bg-[#f6e3a1] px-4 py-3 text-base leading-relaxed font-bold text-[#6a5214]">
        {formatLongDate(parseDateKey(confirmedOn))}に確定しました。{title}の担当と報酬は変更できません。
      </p>
    );
  }

  if (!ended) {
    return (
      <div className="flex flex-col gap-2">
        <button
          type="button"
          disabled
          className="min-h-14 rounded-2xl bg-stone-200 text-lg font-bold text-stone-500"
        >
          この月の報酬を確定する
        </button>
        <p className="text-base leading-relaxed text-stone-700">
          この月が終わってから確定できます。確定した月の担当と報酬は、あとから変えられません。
        </p>
      </div>
    );
  }

  if (!asking) {
    return (
      <div className="flex flex-col gap-2">
        <button
          type="button"
          className="min-h-14 rounded-2xl bg-[#d7efe4] text-lg font-bold text-[#2a5646]"
          onClick={() => {
            setError("");
            setAsking(true);
          }}
        >
          この月の報酬を確定する
        </button>
        <p className="text-base leading-relaxed text-stone-700">
          月末に確定すると、{title}の担当と報酬はあとから変えられません。
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl border-2 border-[#c4a24a] bg-[#fff8e4] p-4">
      <p className="text-base leading-relaxed font-bold text-stone-950">
        {title}の報酬を確定します。担当と金額は、このあとに変えられません。
      </p>
      {error ? (
        <p className="text-base font-bold text-red-800" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        className="min-h-14 rounded-2xl bg-[#d7efe4] text-lg font-bold text-[#2a5646]"
        onClick={() => {
          const result = onConfirm();
          if (!result.ok) setError(result.reason);
        }}
      >
        確定する
      </button>
      <button
        type="button"
        className="min-h-14 rounded-2xl border-2 border-stone-300 bg-white text-lg font-bold text-stone-800"
        onClick={() => setAsking(false)}
      >
        やめる
      </button>
    </div>
  );
}

function downloadSummary(
  year: number,
  month: number,
  summary: MonthSummary,
  members: Member[],
  room?: string,
) {
  const csv = `\uFEFF${summaryCsv(year, month, summary, members)}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = summaryCsvFilename(year, month, room);
  link.click();
  URL.revokeObjectURL(url);
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#efe3d4] bg-white px-4 py-3">
      <p className="text-base text-stone-700">{label}</p>
      <p className="text-2xl font-bold text-stone-950">{value}</p>
    </div>
  );
}
