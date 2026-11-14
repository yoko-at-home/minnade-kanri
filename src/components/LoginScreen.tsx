"use client";

import { Building } from "lucide-react";
import { useState } from "react";
import { useApp } from "@/context/AppContext";
import { MEMBERS, memberLabel, PASSPHRASE } from "@/lib/members";

export function LoginScreen() {
  const { login } = useApp();
  const [passphrase, setPassphrase] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState("");

  function confirmPassphrase() {
    if (passphrase.trim() !== PASSPHRASE) {
      setUnlocked(false);
      setError("合言葉が違います。もう一度入力してください。");
      return;
    }
    setError("");
    setUnlocked(true);
  }

  return (
    <div className="min-h-dvh bg-[#efe8dc] px-4 py-8">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <div className="flex items-center gap-3">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1f6a45] text-white">
            <Building aria-hidden size={30} />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-stone-950">みんなで管理</h1>
            <p className="text-base text-stone-700">当番と報酬の試作品</p>
          </div>
        </div>

        <section className="rounded-3xl border border-[#e4d9c8] bg-white p-5">
          <p className="text-lg leading-relaxed text-stone-900">
            ゴミ出しや立ち会いの担当を、住人で分け合うための画面です。まず合言葉を入れて、自分の部屋を選んでください。
          </p>
          <form
            className="mt-5 flex flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              confirmPassphrase();
            }}
          >
            <label className="text-base font-bold text-stone-900" htmlFor="passphrase">
              合言葉
            </label>
            <input
              id="passphrase"
              value={passphrase}
              onChange={(event) => setPassphrase(event.target.value)}
              autoComplete="off"
              enterKeyHint="go"
              className="h-14 rounded-2xl border-2 border-stone-300 px-4 text-lg"
            />
            <button
              type="submit"
              className="h-14 rounded-2xl bg-[#1f6a45] text-lg font-bold text-white"
            >
              合言葉を確認する
            </button>
            <p className="text-base text-stone-700">試しに使う合言葉は 1234 です。</p>
            {error ? (
              <p className="text-base font-bold text-red-800" role="alert">
                {error}
              </p>
            ) : null}
          </form>
        </section>

        {unlocked ? (
          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-bold text-stone-950">あなたはどの部屋ですか？</h2>
            {MEMBERS.map((member) => (
              <button
                key={member.id}
                type="button"
                className="min-h-14 rounded-2xl border-2 border-[#1d4e89] bg-white px-4 py-3 text-left text-lg font-bold text-[#1d4e89]"
                onClick={() => {
                  const result = login(passphrase, member.id);
                  if (!result.ok) setError(result.reason);
                }}
              >
                {memberLabel(member)}
              </button>
            ))}
          </section>
        ) : null}
      </div>
    </div>
  );
}
