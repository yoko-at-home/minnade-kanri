"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { addMonths } from "@/lib/schedule";

export function MonthSwitcher() {
  const { view, today, shiftMonth, goToThisMonth } = useApp();
  const showingThisMonth = view.year === today.year && view.month === today.month;
  const previous = addMonths(view.year, view.month, -1);
  const next = addMonths(view.year, view.month, 1);

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          className="flex min-h-14 items-center justify-center gap-0.5 rounded-2xl bg-stone-200 px-1 text-base font-bold leading-tight text-stone-900"
          onClick={() => shiftMonth(-1)}
        >
          <ChevronLeft aria-hidden size={18} />
          <span className="text-center">
            {previous.year}年
            <br />
            {previous.month + 1}月
          </span>
        </button>
        <button
          type="button"
          className={`min-h-14 rounded-2xl px-1 text-base font-bold leading-tight ${
            showingThisMonth
              ? "bg-[#f8d5e2] text-[#7a3d55]"
              : "bg-white text-stone-950"
          }`}
          aria-current={showingThisMonth ? "date" : undefined}
        >
          {view.year}年
          <br />
          {view.month + 1}月
        </button>
        <button
          type="button"
          className="flex min-h-14 items-center justify-center gap-0.5 rounded-2xl bg-stone-200 px-1 text-base font-bold leading-tight text-stone-900"
          onClick={() => shiftMonth(1)}
        >
          <span className="text-center">
            {next.year}年
            <br />
            {next.month + 1}月
          </span>
          <ChevronRight aria-hidden size={18} />
        </button>
      </div>
      {showingThisMonth ? null : (
        <button
          type="button"
          className="min-h-12 rounded-2xl bg-[#d7efe4] text-base font-bold text-[#2a5646]"
          onClick={goToThisMonth}
        >
          今月に戻す
        </button>
      )}
    </div>
  );
}
