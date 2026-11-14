"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { monthTitle } from "@/lib/schedule";

export function MonthSwitcher() {
  const { view, today, shiftMonth, goToThisMonth } = useApp();
  const showingThisMonth = view.year === today.year && view.month === today.month;

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-center text-2xl font-bold text-stone-950">
        {monthTitle(view.year, view.month)}
      </h2>
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          className="flex h-12 items-center justify-center gap-1 rounded-2xl border-2 border-stone-300 bg-white text-base font-bold"
          onClick={() => shiftMonth(-1)}
        >
          <ChevronLeft aria-hidden size={20} />
          前月
        </button>
        <button
          type="button"
          className={`h-12 rounded-2xl text-base font-bold ${
            showingThisMonth
              ? "bg-[#1f6a45] text-white"
              : "border-2 border-[#1f6a45] bg-white text-[#1f6a45]"
          }`}
          onClick={goToThisMonth}
        >
          今月
        </button>
        <button
          type="button"
          className="flex h-12 items-center justify-center gap-1 rounded-2xl border-2 border-stone-300 bg-white text-base font-bold"
          onClick={() => shiftMonth(1)}
        >
          翌月
          <ChevronRight aria-hidden size={20} />
        </button>
      </div>
    </div>
  );
}
