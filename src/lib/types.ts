export type Role = "resident" | "admin";

export type Member = {
  id: string;
  room: string;
  name: string;
  role: Role;
};

export type GarbageType =
  | "burnable"
  | "plastic"
  | "pet"
  | "recycle"
  | "nonburnable"
  | "off";

export type ShiftSlot = {
  assigneeId: string | null;
  seekingReplacement: boolean;
};

export type ShiftRecord = {
  capacity: 1 | 2;
  specialAllowance: boolean;
  note: string;
  handover: string;
  slots: ShiftSlot[];
};

export type ShiftDay = ShiftRecord & {
  date: string;
  garbageType: GarbageType;
};

export type StoredState = {
  version: 1;
  currentUserId: string | null;
  shifts: Record<string, ShiftRecord>;
};

export type ActionResult =
  | { ok: true }
  | { ok: false; reason: string };
