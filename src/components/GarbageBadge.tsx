import { GARBAGE_META } from "@/lib/schedule";
import type { GarbageType } from "@/lib/types";

export function GarbageBadge({ type }: { type: GarbageType }) {
  const meta = GARBAGE_META[type];
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-base font-bold ring-1 ${meta.badgeClass}`}
    >
      {meta.short}
    </span>
  );
}
