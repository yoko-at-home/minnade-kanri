import { DEFAULT_ROLES, DEFAULT_ROSTER, normalizeRoles, normalizeRoster } from "@/lib/members";
import { localShiftStore } from "@/lib/persistence";
import { normalizeRecord, toDateKey } from "@/lib/schedule";
import { seedShifts } from "@/lib/seed";
import type { ShiftRecord, StoredState } from "@/lib/types";

export type Clock = {
  year: number;
  month: number;
  dateKey: string;
};

const SERVER_CLOCK: Clock = { year: 0, month: -1, dateKey: "" };
let clock: Clock | null = null;

export function subscribeClock(): () => void {
  return () => {};
}

export function getClockSnapshot(): Clock {
  if (!clock) {
    const today = new Date();
    clock = {
      year: today.getFullYear(),
      month: today.getMonth(),
      dateKey: toDateKey(today),
    };
  }
  return clock;
}

export function getServerClock(): Clock {
  return SERVER_CLOCK;
}

export function isServerClock(value: Clock): boolean {
  return value === SERVER_CLOCK;
}

const SERVER_SNAPSHOT: StoredState = {
  version: 1,
  currentUserId: null,
  roster: DEFAULT_ROSTER,
  roles: DEFAULT_ROLES,
  shifts: {},
};

let memory: StoredState | null = null;
const listeners = new Set<() => void>();

function normalizeMap(shifts: Record<string, ShiftRecord>): Record<string, ShiftRecord> {
  const next: Record<string, ShiftRecord> = {};
  for (const [dateKey, record] of Object.entries(shifts)) {
    next[dateKey] = normalizeRecord(record);
  }
  return next;
}

function ensure(): StoredState {
  if (memory?.roster) return memory;
  const saved = localShiftStore.load();
  if (saved) {
    const roster = normalizeRoster(saved.roster);
    memory = {
      version: 1,
      currentUserId: saved.currentUserId,
      roster,
      roles: normalizeRoles(saved.roles, roster),
      shifts: normalizeMap(saved.shifts),
    };
  } else {
    const roster = DEFAULT_ROSTER.map((entry) => ({ ...entry }));
    memory = {
      version: 1,
      currentUserId: null,
      roster,
      roles: normalizeRoles(DEFAULT_ROLES, roster),
      shifts: seedShifts(),
    };
  }
  return memory;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getClientSnapshot(): StoredState {
  return ensure();
}

export function getServerSnapshot(): StoredState {
  return SERVER_SNAPSHOT;
}

export function isServerSnapshot(state: StoredState): boolean {
  return state === SERVER_SNAPSHOT;
}

export function updateStore(recipe: (current: StoredState) => StoredState) {
  memory = recipe(ensure());
  for (const listener of listeners) listener();
}
