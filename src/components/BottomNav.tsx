"use client";

import { CalendarDays, Wallet } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "カレンダー", icon: CalendarDays },
  { href: "/summary", label: "報酬集計", icon: Wallet },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky bottom-0 z-20 border-t border-[#e4d9c8] bg-white pb-[env(safe-area-inset-bottom)]">
      <ul className="grid grid-cols-2">
        {items.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-16 flex-col items-center justify-center gap-1 text-base font-bold ${
                  active ? "text-[#1f6a45]" : "text-stone-600"
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
