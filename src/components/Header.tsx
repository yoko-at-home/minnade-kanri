"use client";

import { Building } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { memberLabel } from "@/lib/members";

export function Header() {
  const { currentUser, members, switchUser, resetDemo } = useApp();
  if (!currentUser) return null;

  return (
    <header className="border-b border-[#e4d9c8] bg-[#fbf8f3] px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1f6a45] text-white">
          <Building aria-hidden size={24} />
        </span>
        <div>
          <p className="text-xl font-bold leading-tight text-stone-950">みんなで管理</p>
          <p className="text-base text-stone-700">
            {currentUser.systemAdmin
              ? "システム管理者として見ています"
              : currentUser.role === "admin"
                ? "管理者として見ています"
                : "住人として見ています"}
          </p>
        </div>
      </div>
      <label className="mt-3 block text-base font-bold text-stone-900" htmlFor="current-user">
        今のユーザー（デモ用）
        <select
          id="current-user"
          className="mt-1 h-12 w-full rounded-xl border-2 border-stone-300 bg-white px-3 font-medium"
          value={currentUser.id}
          onChange={(event) => switchUser(event.target.value)}
        >
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {memberLabel(member)}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        className="mt-2 text-base font-bold text-[#1d4e89] underline decoration-2 underline-offset-4"
        onClick={() => {
          const agreed = window.confirm(
            "サンプルのシフトに戻します。担当やメモの変更は消えます。",
          );
          if (agreed) resetDemo();
        }}
      >
        サンプルのシフトに戻す
      </button>
    </header>
  );
}
