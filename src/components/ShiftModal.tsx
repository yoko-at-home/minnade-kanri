"use client";

import { Shield, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { GarbageBadge } from "@/components/GarbageBadge";
import { useApp } from "@/context/AppContext";
import { displayName, memberLabel } from "@/lib/members";
import { formatLongDate, GARBAGE_META, parseDateKey, rewardLabel } from "@/lib/schedule";
import type { ActionResult } from "@/lib/types";

export function ShiftModal({
  dateKey,
  onClose,
}: {
  dateKey: string;
  onClose: () => void;
}) {
  const app = useApp();
  const day = app.getShift(dateKey);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const date = parseDateKey(dateKey);
  const off = day.garbageType === "off";
  const meta = GARBAGE_META[day.garbageType];
  const handover = app.previousHandover(dateKey);
  const isAdmin = app.currentUser?.role === "admin";
  const mine = day.slots.some((slot) => slot.assigneeId === app.currentUser?.id);

  const [note, setNote] = useState(day.note);
  const [memo, setMemo] = useState(day.handover);
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
      if (dialog.open) dialog.close();
    };
  }, []);

  function report(result: ActionResult, success: string) {
    if (result.ok) {
      setMessage("");
      setSaved(success);
      return;
    }
    setSaved("");
    setMessage(result.reason);
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className="mt-auto! mr-0! mb-0! ml-0! h-fit max-h-[92dvh] w-full! max-w-none! overflow-y-auto rounded-t-3xl border-0 bg-[#fbf8f3] p-5 text-stone-950 shadow-2xl backdrop:bg-stone-950/50 sm:m-auto! sm:max-w-md! sm:rounded-3xl"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        event.preventDefault();
        onClose();
      }}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id={titleId} className="text-2xl font-bold text-stone-950">
              {formatLongDate(date)}
            </h2>
            <p className="mt-1 text-base text-stone-700">{meta.detail}</p>
          </div>
          <button
            type="button"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 border-stone-300 bg-white"
            onClick={onClose}
            aria-label="閉じる"
          >
            <X aria-hidden size={26} />
          </button>
        </div>

        {off ? (
          <p className="mt-6 text-lg leading-relaxed text-stone-800">
            日曜・月曜はお休みです。担当は入りません。
          </p>
        ) : (
          <div className="mt-5 flex flex-col gap-5">
            <div className="flex flex-wrap items-center gap-2">
              <GarbageBadge type={day.garbageType} />
              <p className="text-lg font-bold text-[#1d4e89]">{rewardLabel(day.specialAllowance)}</p>
            </div>

            <section className="rounded-2xl bg-white p-4">
              <h3 className="text-base font-bold text-stone-700">備考・立ち会い</h3>
              <p className="mt-1 text-lg leading-relaxed text-stone-950">
                {day.note || "備考はありません"}
              </p>
            </section>

            <section className="rounded-2xl bg-white p-4">
              <h3 className="text-base font-bold text-stone-700">前日からの申し送り</h3>
              {handover ? (
                <>
                  <p className="mt-1 text-base text-stone-700">
                    {handover.label}
                    {handover.names ? `　${handover.names}` : ""}
                  </p>
                  <p className="mt-1 text-lg leading-relaxed text-stone-950">{handover.text}</p>
                </>
              ) : (
                <p className="mt-1 text-lg text-stone-800">申し送りはありません</p>
              )}
            </section>

            <section className="flex flex-col gap-3">
              <h3 className="text-base font-bold text-stone-700">担当</h3>
              {day.slots.map((slot, index) => {
                const slotKey = slot.assigneeId ?? (slot === day.slots[0] ? "first-open" : "second-open");
                const member = app.members.find((item) => item.id === slot.assigneeId);
                const isMine = slot.assigneeId === app.currentUser?.id;
                const canClaim =
                  !day.slots.some((item) => item.assigneeId === app.currentUser?.id) &&
                  (!slot.assigneeId || slot.seekingReplacement);
                return (
                  <div key={slotKey} className="rounded-2xl border-2 border-[#e4d9c8] bg-white p-4">
                    <p className="text-base font-bold text-stone-700">
                      {day.capacity === 2 ? `${index + 1}枠目` : "この日の担当"}
                    </p>
                    <p className="mt-1 text-xl font-bold text-stone-950">
                      {member ? displayName(member) : "空き枠（募集中）"}
                    </p>
                    {slot.seekingReplacement ? (
                      <p className="mt-2 inline-flex rounded-full bg-orange-600 px-3 py-1 text-base font-bold text-white">
                        交代してください🙏
                      </p>
                    ) : null}
                    {canClaim ? (
                      <button
                        type="button"
                        className="mt-3 h-14 w-full rounded-2xl bg-[#1f6a45] text-lg font-bold text-white"
                        onClick={() =>
                          report(
                            app.claim(dateKey, index),
                            slot.seekingReplacement ? "交代の担当が決まりました" : "この日の担当が決まりました",
                          )
                        }
                      >
                        {slot.seekingReplacement ? "交代で担当する" : "この日を担当する"}
                      </button>
                    ) : null}
                    {isMine ? (
                      <button
                        type="button"
                        className="mt-3 h-14 w-full rounded-2xl border-2 border-orange-700 bg-orange-50 text-lg font-bold text-orange-800"
                        onClick={() =>
                          report(
                            app.toggleReplacement(dateKey, index),
                            slot.seekingReplacement
                              ? "交代の募集を取り消しました"
                              : "交代を募集しました。決まるまで担当はあなたのままです",
                          )
                        }
                      >
                        {slot.seekingReplacement
                          ? "交代の募集を取り消す"
                          : "交代を募集する（キャンセル）"}
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </section>

            {mine ? (
              <section className="rounded-2xl bg-white p-4">
                <label className="text-base font-bold text-stone-900" htmlFor="handover">
                  申し送りメモを書く
                </label>
                <p className="mt-1 text-base leading-relaxed text-stone-700">
                  次の稼働日の人に伝わります。
                </p>
                <textarea
                  id="handover"
                  value={memo}
                  onChange={(event) => setMemo(event.target.value)}
                  placeholder="例：雨のため外掃除スキップしました"
                  className="mt-2 min-h-28 w-full rounded-2xl border-2 border-stone-300 p-3 text-base leading-relaxed"
                />
                <button
                  type="button"
                  className="mt-3 h-14 w-full rounded-2xl bg-[#1d4e89] text-lg font-bold text-white"
                  onClick={() => report(app.setHandover(dateKey, memo), "申し送りを保存しました")}
                >
                  申し送りを保存
                </button>
              </section>
            ) : null}

            {isAdmin ? (
              <section className="flex flex-col gap-3 rounded-2xl border-2 border-[#1d4e89] bg-sky-50 p-4">
                <h3 className="flex items-center gap-2 text-lg font-bold text-[#1d4e89]">
                  <Shield aria-hidden size={22} />
                  管理者の操作
                </h3>
                <label className="text-base font-bold text-stone-900" htmlFor="admin-note">
                  備考の編集
                </label>
                <textarea
                  id="admin-note"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="例：10:00〜 消火栓点検の立ち会いあり"
                  className="min-h-28 w-full rounded-2xl border-2 border-stone-300 bg-white p-3 text-base leading-relaxed"
                />
                <button
                  type="button"
                  className="h-14 rounded-2xl bg-[#1d4e89] text-lg font-bold text-white"
                  onClick={() => report(app.setNote(dateKey, note), "備考を保存しました")}
                >
                  備考を保存
                </button>
                <SwitchRow
                  label="特別手当（+1,000円）を付与"
                  pressed={day.specialAllowance}
                  onClick={() =>
                    report(
                      app.setSpecial(dateKey, !day.specialAllowance),
                      day.specialAllowance ? "特別手当を外しました" : "特別手当を付けました",
                    )
                  }
                />
                <SwitchRow
                  label="募集人数を2名にする（台風翌日など）"
                  pressed={day.capacity === 2}
                  onClick={() =>
                    report(
                      app.setCapacity(dateKey, day.capacity === 2 ? 1 : 2),
                      day.capacity === 2 ? "募集を1名に戻しました" : "募集を2名にしました",
                    )
                  }
                />
                {day.slots.map((slot, index) => (
                  <label
                    key={slot.assigneeId ?? (slot === day.slots[0] ? "first-open" : "second-open")}
                    className="text-base font-bold text-stone-900"
                  >
                    {day.capacity === 2 ? `${index + 1}枠目を代わりに決める` : "代わりに担当者を決める"}
                    <select
                      className="mt-1 h-12 w-full rounded-xl border-2 border-stone-300 bg-white px-3 font-medium"
                      value={slot.assigneeId ?? ""}
                      onChange={(event) => {
                        const memberId = event.target.value || null;
                        report(
                          app.assign(dateKey, index, memberId),
                          memberId ? "担当者を入れました" : "空き枠に戻しました",
                        );
                      }}
                    >
                      <option value="">空き枠</option>
                      {app.members.map((member) => (
                        <option key={member.id} value={member.id}>
                          {memberLabel(member)}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </section>
            ) : null}

            {saved ? (
              <output className="block text-base font-bold text-emerald-900">{saved}</output>
            ) : null}
            {message ? (
              <p className="text-base font-bold text-red-800" role="alert">
                {message}
              </p>
            ) : null}
          </div>
        )}
    </dialog>
  );
}

function SwitchRow({
  label,
  pressed,
  onClick,
}: {
  label: string;
  pressed: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={pressed}
      onClick={onClick}
      className="flex min-h-14 w-full items-center justify-between gap-4 rounded-2xl border-2 border-stone-300 bg-white px-4 py-3 text-left"
    >
      <span className="text-base font-bold text-stone-950">{label}</span>
      <span
        className={`relative h-8 w-14 shrink-0 rounded-full ${pressed ? "bg-[#1f6a45]" : "bg-stone-300"}`}
      >
        <span
          className={`absolute top-1 h-6 w-6 rounded-full bg-white ${pressed ? "left-7" : "left-1"}`}
        />
      </span>
    </button>
  );
}
