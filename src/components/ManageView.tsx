"use client";

import { useState } from "react";
import { useApp } from "@/context/AppContext";
import { accountTypeLabel, displayName } from "@/lib/members";
import type { AccountType, Member, Role } from "@/lib/types";

export function ManageView() {
  const { currentUser, members, setMemberRole, addMember, updateMember, removeMember } = useApp();
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [room, setRoom] = useState("");
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRoom, setEditRoom] = useState("");
  const [editName, setEditName] = useState("");
  const [bankName, setBankName] = useState("");
  const [branchName, setBranchName] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolder, setAccountHolder] = useState("");

  if (!currentUser?.systemAdmin) {
    return (
      <p className="rounded-2xl bg-white px-4 py-6 text-lg leading-relaxed text-stone-800">
        この画面はシステム管理者だけが使えます。
      </p>
    );
  }

  function report(result: { ok: true } | { ok: false; reason: string }, success: string) {
    setMessage(result.ok ? { text: success, ok: true } : { text: result.reason, ok: false });
  }

  function changeRole(memberId: string, role: Role) {
    report(setMemberRole(memberId, role), "役割を保存しました。管理者手当は翌月から変わります。");
  }

  function startEdit(member: Member) {
    setEditingId(member.id);
    setEditRoom(member.room);
    setEditName(member.name);
    setBankName(member.bankName);
    setBranchName(member.branchName);
    setAccountType(member.accountType);
    setAccountNumber(member.accountNumber);
    setAccountHolder(member.accountHolder);
    setMessage(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-2xl font-bold text-stone-950">住人の管理</h2>
      <p className="text-base leading-relaxed text-stone-700">
        住人の追加と削除、部屋、名前、振込先の口座を編集できます。管理者にすると、備考、特別手当、募集人数、代わりの担当登録ができます。管理者手当の1万円は、変えた翌月から付きます。
      </p>

      <form
        className="flex flex-col gap-3 rounded-2xl border border-[#e4d9c8] bg-white p-4"
        onSubmit={(event) => {
          event.preventDefault();
          const result = addMember(room, name);
          report(result, "住人を追加しました");
          if (result.ok) {
            setRoom("");
            setName("");
          }
        }}
      >
        <h3 className="text-xl font-bold text-stone-950">住人を追加</h3>
        <label className="text-base font-bold text-stone-900" htmlFor="new-room">
          部屋
        </label>
        <input
          id="new-room"
          value={room}
          onChange={(event) => setRoom(event.target.value)}
          autoComplete="off"
          className="h-14 rounded-2xl border-2 border-stone-300 px-4 text-lg"
        />
        <label className="text-base font-bold text-stone-900" htmlFor="new-name">
          名前
        </label>
        <input
          id="new-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoComplete="off"
          className="h-14 rounded-2xl border-2 border-stone-300 px-4 text-lg"
        />
        <button
          type="submit"
          className="min-h-14 rounded-2xl bg-[#1f6a45] text-lg font-bold text-white"
        >
          追加する
        </button>
        {editingId ? null : <Status message={message} />}
      </form>

      {members.map((member) => {
        const isAdmin = member.role === "admin";
        const editing = editingId === member.id;
        return (
          <article key={member.id} className="rounded-2xl border border-[#e4d9c8] bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold text-stone-950">{displayName(member)}</h3>
                <p className="mt-1 text-base text-stone-700">{isAdmin ? "管理者" : "住人"}</p>
                {member.systemAdmin ? (
                  <p className="mt-1 text-base text-stone-700">システム管理者です。この画面を使えます。</p>
                ) : null}
                <AccountLine member={member} />
              </div>
              <button
                type="button"
                className={`shrink-0 rounded-full px-3 py-1 text-sm font-bold ${
                  isAdmin
                    ? "border border-stone-400 bg-white text-stone-800"
                    : "bg-[#1d4e89] text-white"
                }`}
                onClick={() => changeRole(member.id, isAdmin ? "resident" : "admin")}
              >
                {isAdmin ? "住人に戻す" : "管理者にする"}
              </button>
            </div>
            {editing ? (
              <form
                className="mt-3 flex flex-col gap-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  const result = updateMember(member.id, {
                    room: editRoom,
                    name: editName,
                    bankName,
                    branchName,
                    accountType,
                    accountNumber,
                    accountHolder,
                  });
                  report(result, "住人を保存しました");
                  if (result.ok) setEditingId(null);
                }}
              >
                <label className="text-base font-bold text-stone-900" htmlFor={`room-${member.id}`}>
                  部屋
                </label>
                <input
                  id={`room-${member.id}`}
                  value={editRoom}
                  onChange={(event) => setEditRoom(event.target.value)}
                  autoComplete="off"
                  className="h-14 rounded-2xl border-2 border-stone-300 px-4 text-lg"
                />
                <label className="text-base font-bold text-stone-900" htmlFor={`name-${member.id}`}>
                  名前
                </label>
                <input
                  id={`name-${member.id}`}
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                  autoComplete="off"
                  className="h-14 rounded-2xl border-2 border-stone-300 px-4 text-lg"
                />
                <label className="text-base font-bold text-stone-900" htmlFor={`bank-${member.id}`}>
                  銀行名
                </label>
                <input
                  id={`bank-${member.id}`}
                  value={bankName}
                  onChange={(event) => setBankName(event.target.value)}
                  autoComplete="off"
                  className="h-14 rounded-2xl border-2 border-stone-300 px-4 text-lg"
                />
                <label className="text-base font-bold text-stone-900" htmlFor={`branch-${member.id}`}>
                  支店名
                </label>
                <input
                  id={`branch-${member.id}`}
                  value={branchName}
                  onChange={(event) => setBranchName(event.target.value)}
                  autoComplete="off"
                  className="h-14 rounded-2xl border-2 border-stone-300 px-4 text-lg"
                />
                <label className="text-base font-bold text-stone-900" htmlFor={`type-${member.id}`}>
                  口座種別
                </label>
                <select
                  id={`type-${member.id}`}
                  value={accountType}
                  onChange={(event) => setAccountType(event.target.value as AccountType)}
                  className="h-14 rounded-2xl border-2 border-stone-300 bg-white px-4 text-lg"
                >
                  <option value="">未設定</option>
                  <option value="ordinary">普通</option>
                  <option value="checking">当座</option>
                </select>
                <label className="text-base font-bold text-stone-900" htmlFor={`number-${member.id}`}>
                  口座番号
                </label>
                <input
                  id={`number-${member.id}`}
                  value={accountNumber}
                  onChange={(event) => setAccountNumber(event.target.value)}
                  inputMode="numeric"
                  autoComplete="off"
                  className="h-14 rounded-2xl border-2 border-stone-300 px-4 text-lg"
                />
                <label className="text-base font-bold text-stone-900" htmlFor={`holder-${member.id}`}>
                  口座名義
                </label>
                <input
                  id={`holder-${member.id}`}
                  value={accountHolder}
                  onChange={(event) => setAccountHolder(event.target.value)}
                  autoComplete="off"
                  className="h-14 rounded-2xl border-2 border-stone-300 px-4 text-lg"
                />
                <Status message={message} />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="min-h-12 flex-1 rounded-2xl bg-[#1f6a45] text-lg font-bold text-white"
                  >
                    保存
                  </button>
                  <button
                    type="button"
                    className="min-h-12 flex-1 rounded-2xl border-2 border-stone-300 bg-white text-lg font-bold text-stone-900"
                    onClick={() => setEditingId(null)}
                  >
                    やめる
                  </button>
                </div>
              </form>
            ) : (
              <div className="mt-3 flex items-center justify-between gap-3">
                <button
                  type="button"
                  className="text-base font-bold text-[#1d4e89] underline"
                  onClick={() => startEdit(member)}
                >
                  編集
                </button>
                {member.systemAdmin ? null : (
                  <button
                    type="button"
                    className="text-base font-bold text-red-800 underline"
                    onClick={() => {
                      const agreed = window.confirm(
                        `${displayName(member)} を削除します。この人の担当は空き枠に戻ります。`,
                      );
                      if (!agreed) return;
                      report(removeMember(member.id), "住人を削除しました");
                    }}
                  >
                    削除
                  </button>
                )}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}

function AccountLine({ member }: { member: Member }) {
  const parts = [
    member.bankName,
    member.branchName,
    accountTypeLabel(member.accountType),
    member.accountNumber,
    member.accountHolder,
  ].filter(Boolean);
  return (
    <p className="mt-1 text-base text-stone-700">
      {parts.length > 0 ? `振込先 ${parts.join(" ")}` : "振込先は未登録です"}
    </p>
  );
}

function Status({ message }: { message: { text: string; ok: boolean } | null }) {
  if (!message) return null;
  return (
    <p
      className={`text-base font-bold ${message.ok ? "text-emerald-900" : "text-red-800"}`}
      role={message.ok ? "status" : "alert"}
    >
      {message.text}
    </p>
  );
}
