import { GARBAGE_META, parseDateKey } from "@/lib/schedule";
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

export function MonthGrid({
  days,
  todayKey,
  members,
  onSelect,
  highlightUserId,
  variant = "calendar",
}: {
  days: ShiftDay[];
  todayKey: string;
  members: Member[];
  onSelect?: (dateKey: string) => void;
  /** summary では、この人の担当日だけを黄色にする。 */
  highlightUserId?: string;
  /** summary はログイン中の担当日を黄色、空き枠をグレーにする。 */
  variant?: "calendar" | "summary";
}) {
  const lead = days.length === 0 ? 0 : parseDateKey(days[0].date).getDay();
  const summary = variant === "summary";

  return (
    <section className="flex flex-col gap-2" aria-label="ひと月のカレンダー">
      <div className="grid grid-cols-7 gap-1" role="grid">
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
          const mine =
            !off &&
            Boolean(
              highlightUserId &&
                day.slots.some((slot) => slot.assigneeId === highlightUserId),
            );
          const vacancy = !off && day.slots.some((slot) => !slot.assigneeId);
          const fullyOpen = vacancy && names.length === 0;
          const recruitingTwo = !summary && vacancy && day.capacity === 2;
          const oneLeft = recruitingTwo && names.length > 0;
          const pink = !summary && (fullyOpen || oneLeft);
          const yellow = summary && mine;
          const muted = summary && fullyOpen;
          const label = `${date.getMonth() + 1}月${date.getDate()}日 ${garbage}${
            names.length > 0 ? ` ${names.join("、")}` : ""
          }${mine ? " あなたの担当" : ""}${
            muted || (!summary && vacancy && !oneLeft && !recruitingTwo) ? " 空き枠" : ""
          }${oneLeft ? " あと1人" : recruitingTwo ? " 2人募集" : ""}`;
          const className = `flex min-h-16 flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 ${
            off
              ? "bg-stone-100 text-stone-400"
              : yellow
                ? `bg-[#f6e3a1] font-bold text-[#6a5214] ${
                    today ? "ring-2 ring-[#c4a24a]" : ""
                  }`
                : muted
                  ? `bg-stone-200 text-stone-400 ${today ? "ring-2 ring-stone-400" : ""}`
                  : pink
                    ? `bg-[#f8d5e2] font-bold text-[#7a3d55] ${
                        today ? "ring-2 ring-[#c48aa0]" : ""
                      }`
                    : `border border-[#efe3d4] bg-white text-stone-800 ${
                        today ? "ring-2 ring-[#8fbfa8]" : ""
                      }`
          }`;
          const body = (
            <>
              <span className="flex items-center gap-0.5">
                <span className="text-lg leading-none">{date.getDate()}</span>
                {off ? null : (
                  <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${garbageDot[day.garbageType]} ${
                      muted ? "opacity-40" : ""
                    }`}
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
            </>
          );
          if (onSelect) {
            return (
              <button
                key={day.date}
                type="button"
                onClick={() => onSelect(day.date)}
                aria-current={today ? "date" : undefined}
                aria-label={label}
                className={className}
              >
                {body}
              </button>
            );
          }
          return (
            <div
              key={day.date}
              role="gridcell"
              aria-current={today ? "date" : undefined}
              aria-label={label}
              className={className}
            >
              {body}
            </div>
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
