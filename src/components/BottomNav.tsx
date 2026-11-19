"use client";

import { CalendarDays, Shield, Wallet } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/context/AppContext";

const items = [
  { href: "/", label: "カレンダー", icon: CalendarDays },
  { href: "/summary", label: "報酬集計", icon: Wallet },
  { href: "/manage", label: "管理", icon: Shield, systemAdminOnly: true },
];

export function BottomNav() {
  const pathname = usePathname();
  const { currentUser } = useApp();
  const visible = items.filter((item) => !item.systemAdminOnly || currentUser?.systemAdmin);

  return (
    <nav className="sticky bottom-0 z-20 border-t border-[#efe3d4] bg-white pb-[env(safe-area-inset-bottom)]">
      <ul className={visible.length > 2 ? "grid grid-cols-3" : "grid grid-cols-2"}>
        {visible.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-16 flex-col items-center justify-center gap-1 text-base font-bold ${
                  active ? "text-[#3d6b58]" : "text-stone-500"
                }`}
              >
                <Icon aria-hidden size={26} strokeWidth={2.25} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
