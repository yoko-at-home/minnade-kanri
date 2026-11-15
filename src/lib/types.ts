export type Role = "resident" | "admin";

/** 部屋と名前。役割（管理者かどうか）は別に保存する。 */
export type MemberProfile = {
  id: string;
  room: string;
  name: string;
  /** 管理画面を開ける人。住人の追加では付かない。 */
  systemAdmin: boolean;
};

export type Member = MemberProfile & {
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
  /** 住人の部屋と名前。未保存のときは初期の4人。 */
  roster: MemberProfile[];
  /** メンバーIDごとの役割。無い人は住人として扱う。 */
  roles: Record<string, Role>;
  shifts: Record<string, ShiftRecord>;
};

export type ActionResult =
  | { ok: true }
  | { ok: false; reason: string };
