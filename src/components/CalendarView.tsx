"use client";

import { JapaneseYen, NotebookPen } from "lucide-react";
import { useCallback, useState } from "react";
import { GarbageBadge } from "@/components/GarbageBadge";
import { MonthSwitcher } from "@/components/MonthSwitcher";
import { ShiftModal } from "@/components/ShiftModal";
import { useApp } from "@/context/AppContext";
import { displayName, findMember } from "@/lib/members";
import {
  formatMonthDay,
  formatYen,
  GARBAGE_META,
  parseDateKey,
  rewardOf,
} from "@/lib/schedule";
import type { ShiftDay } from "@/lib/types";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"] as const;

const legend = (["burnable", "plastic", "pet", "recycle", "nonburnable"] as const).map(
  (type) => GARBAGE_META[type],
);

const garbageDot: Record<ShiftDay["garbageType"], string> = {
  burnable: "bg-red-500",
  plastic: "bg-emerald-500",
  pet: "bg-sky-500",
  recycle: "bg-amber-500",
  nonburnable: "bg-violet-500",
  off: "bg-stone-300",
};

function slotIsOpen(day: ShiftDay): boolean {
  return day.slots.some((slot) => !slot.assigneeId || slot.seekingReplacement);
}

function cardClass(day: ShiftDay, todayKey: string): string {
  const base =
    "flex w-full flex-col gap-2 rounded-2xl border px-4 py-3 text-left active:scale-[0.99]";
  const today = day.date === todayKey;
  if (day.garbageType === "off") return `${base} border-stone-200 bg-stone-100`;
  if (slotIsOpen(day)) {
    return `${base} border-[#1f6a45] bg-emerald-50 ${today ? "ring-2 ring-[#1f6a45]" : ""}`;
  }
  return `${base} border-[#e4d9c8] bg-white ${today ? "ring-2 ring-[#1f6a45]" : ""}`;
}

function groupByWeek(days: ShiftDay[]): { id: string; label: string; days: ShiftDay[] }[] {
  const groups: { id: string; days: ShiftDay[] }[] = [];
  for (const day of days) {
    const date = parseDateKey(day.date);
    const last = groups[groups.length - 1];
    if (!last || date.getDay() === 0) groups.push({ id: day.date, days: [day] });
    else last.days.push(day);
  }
  return groups.map((group) => {
    const start = parseDateKey(group.days[0].date);
    const end = parseDateKey(group.days[group.days.length - 1].date);
    const label =
      group.days.length === 1
        ? formatMonthDay(start)
        : `${formatMonthDay(start)} – ${formatMonthDay(end)}`;
    return { ...group, label };
  });
}

function matchesFilter(day: ShiftDay, onlyMine: boolean, onlyOpen: boolean, userId: string | undefined) {
  if (day.garbageType === "off") return !onlyMine && !onlyOpen;
  const mine = day.slots.some((slot) => slot.assigneeId === userId);
  const open = slotIsOpen(day);
  if (onlyMine && !mine) return false;
  if (onlyOpen && !open) return false;
  return true;
}

function highlightMark(onlyMine: boolean, onlyOpen: boolean): string {
  if (onlyOpen) return "空き";
  if (onlyMine) return "担当";
  return "";
}

function filterCaption(onlyMine: boolean, onlyOpen: boolean): string {
  if (onlyMine && onlyOpen) return "緑の日は、あなたの担当で、空き枠もある日です。";
  if (onlyMine) return "緑の日が、あなたの担当です。";
  return "緑の日が、空き枠です。";
}

export function CalendarView() {
  const { currentUser, view, todayKey, shiftsForMonth } = useApp();
  const [onlyMine, setOnlyMine] = useState(false);
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const monthKey = `${view.year}-${view.month}`;
  const [pickedWeek, setPickedWeek] = useState<{ monthKey: string; index: number } | null>(null);
  const closeShift = useCallback(() => setSelected(null), []);

  const monthDays = shiftsForMonth(view.year, view.month);
  const filtering = onlyMine || onlyOpen;
  const weeks = groupByWeek(monthDays);
  const todayWeekIndex = weeks.findIndex((week) =>
    week.days.some((day) => day.date === todayKey),
  );
  const selectedIndex =
    pickedWeek?.monthKey === monthKey
      ? Math.min(pickedWeek.index, Math.max(weeks.length - 1, 0))
      : todayWeekIndex >= 0
        ? todayWeekIndex
        : 0;
  const selectedWeek = weeks[selectedIndex];
  const visibleDays =
    selectedWeek?.days.filter((day) =>
      matchesFilter(day, onlyMine, onlyOpen, currentUser?.id),
    ) ?? [];

  return (
    <div className="flex flex-col gap-4">
      <MonthSwitcher />
      <p className="text-base leading-relaxed text-stone-700">
        {filtering
          ? "ひと月を一覧しています。色のついた日を押すと、詳細を見られます。"
          : "日曜・月曜はお休みです。週を選んで、日付を押すと担当や報酬を確認できます。"}
      </p>
      <ul className="flex flex-wrap gap-2" aria-label="ゴミの色">
        {legend.map((item) => (
          <li
            key={item.short}
            className={`rounded-full px-3 py-1 text-base font-bold ring-1 ${item.badgeClass}`}
          >
            {item.short}
          </li>
        ))}
      </ul>
      <div className="grid grid-cols-1 gap-2">
        <FilterButton pressed={onlyMine} onClick={() => setOnlyMine((value) => !value)}>
          自分の担当日のみ表示
        </FilterButton>
        <FilterButton pressed={onlyOpen} onClick={() => setOnlyOpen((value) => !value)}>
          空き枠のみ表示
        </FilterButton>
      </div>
      {filtering ? (
        <MonthHighlight
          days={monthDays}
          todayKey={todayKey}
          onlyMine={onlyMine}
          onlyOpen={onlyOpen}
          userId={currentUser?.id}
          onSelect={setSelected}
        />
      ) : weeks.length > 0 ? (
        <div
          role="tablist"
          aria-label="週"
          className={`grid gap-1 ${weeks.length > 5 ? "grid-cols-3" : ""}`}
          style={
            weeks.length > 5
              ? undefined
              : { gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1fr))` }
          }
        >
          {weeks.map((week, index) => {
            const active = index === selectedIndex;
            const hasToday = week.days.some((day) => day.date === todayKey);
            return (
              <button
                key={week.id}
                type="button"
                role="tab"
                id={`week-tab-${week.id}`}
                aria-selected={active}
                aria-controls="week-panel"
                onClick={() => setPickedWeek({ monthKey, index })}
                className={`min-h-12 rounded-xl px-0.5 text-base font-bold whitespace-nowrap ${
                  active
                    ? "bg-[#1d4e89] text-white"
                    : hasToday
                      ? "border-2 border-[#1f6a45] bg-white text-[#1f6a45]"
                      : "border-2 border-stone-300 bg-white text-stone-900"
                }`}
              >
                {index + 1}週目
              </button>
            );
          })}
        </div>
      ) : null}
      {!filtering && selectedWeek ? (
        <section
          role="tabpanel"
          id="week-panel"
          aria-labelledby={`week-tab-${selectedWeek.id}`}
          className="flex flex-col gap-2"
        >
          <h3 className="px-1 text-base font-bold text-stone-700">{selectedWeek.label}</h3>
          {visibleDays.length === 0 ? (
            <p className="rounded-2xl bg-white px-4 py-6 text-center text-lg text-stone-800">
              当てはまる日がありません。
            </p>
          ) : (
            visibleDays.map((day) => (
              <DayCard
                key={day.date}
                day={day}
                todayKey={todayKey}
                onSelect={() => setSelected(day.date)}
              />
            ))
          )}
        </section>
      ) : null}
      {selected ? (
        <ShiftModal key={selected} dateKey={selected} onClose={closeShift} />
      ) : null}
    </div>
  );
}

function MonthHighlight({
  days,
  todayKey,
  onlyMine,
  onlyOpen,
  userId,
  onSelect,
}: {
  days: ShiftDay[];
  todayKey: string;
  onlyMine: boolean;
  onlyOpen: boolean;
  userId: string | undefined;
  onSelect: (dateKey: string) => void;
}) {
  const lead = days.length === 0 ? 0 : parseDateKey(days[0].date).getDay();
  const cells: (ShiftDay | null)[] = [...Array.from({ length: lead }, () => null), ...days];
  const highlightedCount = days.filter((day) => matchesFilter(day, onlyMine, onlyOpen, userId)).length;
  const mark = highlightMark(onlyMine, onlyOpen);

  return (
    <section className="flex flex-col gap-2" aria-label="ひと月のカレンダー">
      <p className="px-1 text-base font-bold text-stone-800">{filterCaption(onlyMine, onlyOpen)}</p>
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((label, index) => (
          <div
            key={label}
            className={`py-1 text-center text-sm font-bold ${
              index === 0 || index === 1 ? "text-stone-400" : "text-stone-700"
            }`}
          >
            {label}
          </div>
        ))}
        {cells.map((day, index) => {
          if (!day) return <div key={`pad-${index}`} aria-hidden />;
          const date = parseDateKey(day.date);
          const off = day.garbageType === "off";
          const highlighted = matchesFilter(day, onlyMine, onlyOpen, userId);
          const today = day.date === todayKey;
          const garbage = off ? "お休み" : GARBAGE_META[day.garbageType].short;
          return (
            <button
              key={day.date}
              type="button"
              onClick={() => onSelect(day.date)}
              aria-current={today ? "date" : undefined}
              aria-label={`${date.getMonth() + 1}月${date.getDate()}日 ${garbage}${
                highlighted ? ` ${mark}` : ""
              }`}
              className={`flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 ${
                off
                  ? "bg-stone-100 text-stone-400"
                  : highlighted
                    ? `bg-[#1f6a45] font-bold text-white ${today ? "ring-2 ring-amber-300" : ""}`
                    : `border border-[#e4d9c8] bg-white text-stone-500 ${
                        today ? "ring-2 ring-[#1f6a45]" : ""
                      }`
              }`}
            >
              <span className={`text-lg leading-none ${highlighted ? "text-white" : ""}`}>
                {date.getDate()}
              </span>
              {highlighted ? (
                <span className="text-xs leading-none font-bold">{mark}</span>
              ) : off ? null : (
                <span className={`h-1.5 w-1.5 rounded-full ${garbageDot[day.garbageType]}`} />
              )}
            </button>
          );
        })}
      </div>
      {highlightedCount === 0 ? (
        <p className="rounded-2xl bg-white px-4 py-4 text-center text-lg text-stone-800">
          当てはまる日がありません。
        </p>
      ) : null}
    </section>
  );
}

function FilterButton({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`min-h-12 rounded-2xl px-4 text-base font-bold ${
        pressed ? "bg-[#1d4e89] text-white" : "border-2 border-stone-300 bg-white text-stone-900"
      }`}
    >
      {children}
    </button>
  );
}

function DayCard({
  day,
  todayKey,
  onSelect,
}: {
  day: ShiftDay;
  todayKey: string;
  onSelect: () => void;
}) {
  const date = parseDateKey(day.date);
  const off = day.garbageType === "off";

  return (
    <button type="button" className={cardClass(day, todayKey)} onClick={onSelect}>
      <span className="flex items-start justify-between gap-3">
        <span className="flex items-baseline gap-2">
          <span className={`text-3xl font-bold ${off ? "text-stone-500" : "text-stone-950"}`}>
            {date.getDate()}
          </span>
          <span className={`text-lg font-bold ${off ? "text-stone-500" : "text-stone-800"}`}>
            {WEEKDAYS[date.getDay()]}
          </span>
          {day.date === todayKey ? (
            <span className="rounded-full bg-[#1f6a45] px-2 py-0.5 text-base font-bold text-white">
              今日
            </span>
          ) : null}
        </span>
        {off ? (
          <span className="text-base font-bold text-stone-500">お休み</span>
        ) : (
          <GarbageBadge type={day.garbageType} />
        )}
      </span>
      {off ? null : (
        <>
          <span className="flex flex-col gap-1">
            {day.slots.map((slot, index) => {
              const member = findMember(slot.assigneeId);
              const prefix = day.capacity === 2 ? `${index + 1}枠目 ` : "";
              return (
                <span key={index} className="flex flex-wrap items-center gap-2 text-lg">
                  {member ? (
                    <span className="font-bold text-stone-950">
                      {prefix}
                      {displayName(member)}
                    </span>
                  ) : (
                    <span className="font-bold text-emerald-900">{prefix}空き枠（募集中）</span>
                  )}
                  {slot.seekingReplacement ? (
                    <span className="rounded-full bg-orange-600 px-2 py-0.5 text-base font-bold text-white">
                      交代してください🙏
                    </span>
                  ) : null}
                </span>
              );
            })}
          </span>
          <span className="flex flex-wrap items-center gap-2 text-base">
            <span className="font-bold text-[#1d4e89]">{formatYen(rewardOf(day.specialAllowance))}</span>
            {day.specialAllowance ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 font-bold text-amber-950">
                <JapaneseYen aria-hidden size={18} />
                +1,000円
              </span>
            ) : null}
            {day.note ? (
              <span className="inline-flex items-center gap-1 font-medium text-stone-700">
                <NotebookPen aria-hidden size={18} />
                備考あり
              </span>
            ) : null}
          </span>
        </>
      )}
    </button>
  );
}
