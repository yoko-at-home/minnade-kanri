"use client";

import { JapaneseYen, NotebookPen } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { GarbageBadge } from "@/components/GarbageBadge";
import { MonthSwitcher } from "@/components/MonthSwitcher";
import { ShiftModal } from "@/components/ShiftModal";
import { useApp } from "@/context/AppContext";
import { displayName } from "@/lib/members";
import {
  formatMonthDay,
  formatYen,
  GARBAGE_META,
  parseDateKey,
  rewardOf,
} from "@/lib/schedule";
import type { Member, ShiftDay } from "@/lib/types";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"] as const;

const garbageDot: Record<ShiftDay["garbageType"], string> = {
  burnable: "bg-red-500",
  plastic: "bg-emerald-500",
  pet: "bg-sky-500",
  recycle: "bg-amber-500",
  nonburnable: "bg-violet-500",
  off: "bg-stone-300",
};

const dotLegend = [
  { type: "recycle", label: "リサイクル" },
  { type: "burnable", label: "燃えるごみ" },
  { type: "plastic", label: "プラごみ" },
  { type: "pet", label: "ペットボトル" },
  { type: "nonburnable", label: "不燃ごみ" },
] as const;

function slotIsOpen(day: ShiftDay): boolean {
  return day.slots.some((slot) => !slot.assigneeId || slot.seekingReplacement);
}

function cardClass(day: ShiftDay, todayKey: string): string {
  const base =
    "flex w-full flex-col gap-2 rounded-2xl border px-4 py-3 text-left active:scale-[0.99]";
  const today = day.date === todayKey;
  if (day.garbageType === "off") return `${base} border-stone-200 bg-stone-100`;
  if (slotIsOpen(day)) {
    return `${base} border-[#a9d4c2] bg-[#eef8f3] ${
      today ? "ring-2 ring-[#8fbfa8]" : ""
    }`;
  }
  return `${base} border-[#efe3d4] bg-white ${
    today ? "ring-2 ring-[#8fbfa8]" : ""
  }`;
}

function groupByWeek(
  days: ShiftDay[]
): { id: string; label: string; days: ShiftDay[] }[] {
  const groups: { id: string; days: ShiftDay[] }[] = [];
  for (const day of days) {
    const date = parseDateKey(day.date);
    const last = groups[groups.length - 1];
    if (!last || date.getDay() === 0)
      groups.push({ id: day.date, days: [day] });
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

export function CalendarView() {
  const { members, view, todayKey, shiftsForMonth } = useApp();
  const [monthView, setMonthView] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const closeShift = useCallback(() => setSelected(null), []);
  const weekNavRef = useRef<HTMLElement>(null);
  const [weekNavHeight, setWeekNavHeight] = useState(56);

  const monthDays = shiftsForMonth(view.year, view.month);
  const weeks = groupByWeek(monthDays);
  const jumpWeekId =
    (
      weeks.find((week) => week.days.some((day) => day.date === todayKey)) ??
      weeks[0]
    )?.id ?? "";
  const weekIds = weeks.map((week) => week.id).join("|");
  const [activeWeekId, setActiveWeekId] = useState(jumpWeekId);

  useEffect(() => {
    if (monthView || !weekIds) return;
    const nav = weekNavRef.current;
    if (!nav) return;
    const update = () => setWeekNavHeight(nav.offsetHeight);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(nav);
    return () => observer.disconnect();
  }, [monthView, weekIds]);

  useEffect(() => {
    if (monthView || !jumpWeekId) return;
    setTimeout(() => setActiveWeekId(jumpWeekId), 0);
    document
      .getElementById(`week-${jumpWeekId}`)
      ?.scrollIntoView({ block: "start" });
  }, [monthView, jumpWeekId]);

  useEffect(() => {
    if (monthView || !weekIds) return;
    const ids = weekIds.split("|");
    const markActiveWeek = () => {
      const line = weekNavHeight + 16;
      let current = ids[0] ?? "";
      for (const id of ids) {
        const section = document.getElementById(`week-${id}`);
        if (section && section.getBoundingClientRect().top <= line)
          current = id;
      }
      setActiveWeekId((previous) =>
        previous === current ? previous : current
      );
    };
    markActiveWeek();
    window.addEventListener("scroll", markActiveWeek, { passive: true });
    return () => window.removeEventListener("scroll", markActiveWeek);
  }, [monthView, weekIds, weekNavHeight]);

  return (
    <div className="flex flex-col gap-4">
      <MonthSwitcher />
      <p className="text-base leading-relaxed text-stone-700">
        {monthView
          ? "ピンクの日は空き枠です。名前は、担当が決まっている人です。「2人」は2人とも空き、「あと1人」はもう1人募集している日です。"
          : "日付を押すと担当や報酬を確認できます。下へスクロールすると月末まで見られ、週を押すとその位置まで移動します。"}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <FilterButton pressed={monthView} onClick={() => setMonthView(true)}>
          月表示
        </FilterButton>
        <FilterButton pressed={!monthView} onClick={() => setMonthView(false)}>
          週（詳細）表示
        </FilterButton>
      </div>
      {monthView ? (
        <MonthHighlight
          days={monthDays}
          todayKey={todayKey}
          members={members}
          onSelect={setSelected}
        />
      ) : weeks.length > 0 ? (
        <>
          <nav
            ref={weekNavRef}
            aria-label="週"
            className="sticky top-0 z-10 -mx-4 bg-[#fffaf6] px-4 py-2"
          >
            <div
              className={`grid gap-1 ${weeks.length > 5 ? "grid-cols-3" : ""}`}
              style={
                weeks.length > 5
                  ? undefined
                  : {
                      gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1fr))`,
                    }
              }
            >
              {weeks.map((week, index) => {
                const active = week.id === activeWeekId;
                return (
                  <a
                    key={week.id}
                    href={`#week-${week.id}`}
                    aria-current={active ? "true" : undefined}
                    onClick={(event) => {
                      event.preventDefault();
                      document
                        .getElementById(`week-${week.id}`)
                        ?.scrollIntoView({
                          behavior: "smooth",
                          block: "start",
                        });
                    }}
                    className={`flex min-h-12 items-center justify-center rounded-t-xl rounded-b-none px-0.5 text-base font-bold whitespace-nowrap ${
                      active
                        ? "bg-[#f8d5e2] text-[#7a3d55]"
                        : "bg-stone-200 text-stone-900"
                    }`}
                  >
                    {index + 1}週目
                  </a>
                );
              })}
            </div>
          </nav>
          <div className="flex flex-col gap-4">
            {weeks.map((week) => (
              <section
                key={week.id}
                id={`week-${week.id}`}
                aria-labelledby={`week-label-${week.id}`}
                style={{ scrollMarginTop: weekNavHeight + 8 }}
                className="flex flex-col gap-2"
              >
                <h3
                  id={`week-label-${week.id}`}
                  className="px-1 text-base font-bold text-stone-700"
                >
                  {week.label}
                </h3>
                {week.days.map((day) => (
                  <DayCard
                    key={day.date}
                    day={day}
                    todayKey={todayKey}
                    members={members}
                    onSelect={() => setSelected(day.date)}
                  />
                ))}
              </section>
            ))}
          </div>
        </>
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
  members,
  onSelect,
}: {
  days: ShiftDay[];
  todayKey: string;
  members: Member[];
  onSelect: (dateKey: string) => void;
}) {
  const lead = days.length === 0 ? 0 : parseDateKey(days[0].date).getDay();

  return (
    <section className="flex flex-col gap-2" aria-label="ひと月のカレンダー">
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
        {WEEKDAYS.slice(0, lead).map((label) => (
          <div key={`pad-${label}`} aria-hidden />
        ))}
        {days.map((day) => {
          const date = parseDateKey(day.date);
          const off = day.garbageType === "off";
          const today = day.date === todayKey;
          const garbage = off ? "お休み" : GARBAGE_META[day.garbageType].short;
          const names = day.slots.flatMap((slot) => {
            const member = members.find((item) => item.id === slot.assigneeId);
            return member ? [member.name] : [];
          });
          const vacancy = !off && day.slots.some((slot) => !slot.assigneeId);
          const open = vacancy && names.length === 0;
          const recruitingTwo = vacancy && day.capacity === 2;
          const oneLeft = recruitingTwo && names.length > 0;
          const pink = open || oneLeft;
          return (
            <button
              key={day.date}
              type="button"
              onClick={() => onSelect(day.date)}
              aria-current={today ? "date" : undefined}
              aria-label={`${date.getMonth() + 1}月${date.getDate()}日 ${garbage}${
                names.length > 0 ? ` ${names.join("、")}` : ""
              }${oneLeft ? " あと1人" : recruitingTwo ? " 2人募集" : vacancy ? " 空き枠" : ""}`}
              className={`flex min-h-16 flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 ${
                off
                  ? "bg-stone-100 text-stone-400"
                  : pink
                    ? `bg-[#f8d5e2] font-bold text-[#7a3d55] ${
                        today ? "ring-2 ring-[#c48aa0]" : ""
                      }`
                    : `border border-[#efe3d4] bg-white text-stone-800 ${
                        today ? "ring-2 ring-[#8fbfa8]" : ""
                      }`
              }`}
            >
              <span className="flex items-center gap-0.5">
                <span className="text-lg leading-none">{date.getDate()}</span>
                {off ? null : (
                  <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${garbageDot[day.garbageType]}`}
                  />
                )}
                {recruitingTwo && !oneLeft ? (
                  <span className="text-[11px] leading-none font-bold text-[#c45b7a]">
                    2人
                  </span>
                ) : null}
              </span>
              {names.map((name) => (
                <span
                  key={name}
                  className="max-w-full truncate text-xs leading-tight font-bold"
                >
                  {name}
                </span>
              ))}
              {oneLeft ? (
                <span className="text-[11px] leading-tight font-bold">あと1人</span>
              ) : null}
            </button>
          );
        })}
      </div>
      <ul className="flex flex-wrap gap-x-3 gap-y-1 px-1" aria-label="ゴミの色">
        {dotLegend.map((item) => (
          <li
            key={item.type}
            className="flex items-center gap-1.5 text-base text-stone-800"
          >
            <span
              className={`h-2.5 w-2.5 shrink-0 rounded-full ${garbageDot[item.type]}`}
              aria-hidden
            />
            {item.label}
          </li>
        ))}
      </ul>
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
        pressed ? "bg-[#9ebbe8] text-[#243e62]" : "bg-[#9ed4b8] text-[#1e4a38]"
      }`}
    >
      {children}
    </button>
  );
}

function DayCard({
  day,
  todayKey,
  members,
  onSelect,
}: {
  day: ShiftDay;
  todayKey: string;
  members: Member[];
  onSelect: () => void;
}) {
  const date = parseDateKey(day.date);
  const off = day.garbageType === "off";

  return (
    <button
      type="button"
      className={cardClass(day, todayKey)}
      onClick={onSelect}
    >
      <span className="flex items-start justify-between gap-3">
        <span className="flex items-baseline gap-2">
          <span
            className={`text-3xl font-bold ${
              off ? "text-stone-500" : "text-stone-950"
            }`}
          >
            {date.getDate()}
          </span>
          <span
            className={`text-lg font-bold ${
              off ? "text-stone-500" : "text-stone-800"
            }`}
          >
            {WEEKDAYS[date.getDay()]}
          </span>
          {day.date === todayKey ? (
            <span className="rounded-full bg-[#d7efe4] px-2 py-0.5 text-base font-bold text-[#2a5646]">
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
              const member = members.find(
                (item) => item.id === slot.assigneeId
              );
              const prefix = day.capacity === 2 ? `${index + 1}枠目 ` : "";
              return (
                <span
                  key={
                    slot.assigneeId ??
                    (slot === day.slots[0] ? "first-open" : "second-open")
                  }
                  className="flex flex-wrap items-center gap-2 text-lg"
                >
                  {member ? (
                    <span className="font-bold text-stone-950">
                      {prefix}
                      {displayName(member)}
                    </span>
                  ) : (
                    <span className="font-bold text-[#3d6b58]">
                      {prefix}空き枠（募集中）
                    </span>
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
            <span className="font-bold text-[#4a6890]">
              {formatYen(rewardOf(day.specialAllowance))}
            </span>
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
