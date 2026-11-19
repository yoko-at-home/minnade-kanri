"use client";

import { BottomNav } from "@/components/BottomNav";
import { Header } from "@/components/Header";
import { LoginScreen } from "@/components/LoginScreen";
import { useApp } from "@/context/AppContext";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { ready, currentUser } = useApp();

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#f7f2ec] px-6">
        <p className="text-lg text-stone-800">読み込み中です</p>
      </div>
    );
  }

  if (!currentUser) return <LoginScreen />;

  return (
    <div className="min-h-dvh bg-[#f7f2ec]">
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-[#fffaf6] shadow-xl">
        <Header />
        <main className="flex-1 px-4 pb-24 pt-4">{children}</main>
        <BottomNav />
      </div>
    </div>
  );
}
