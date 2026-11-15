export type Role = "resident" | "admin";

/** 普通預金か当座預金か。未入力は空文字。 */
export type AccountType = "" | "ordinary" | "checking";

/** 部屋と名前、振込先。役割（管理者かどうか）は別に保存する。 */
export type MemberProfile = {
  id: string;
  room: string;
  name: string;
  /** 管理画面を開ける人。住人の追加では付かない。 */
  systemAdmin: boolean;
  bankName: string;
  branchName: string;
  accountType: AccountType;
  accountNumber: string;
  accountHolder: string;
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

/** この年月から、管理者手当をもらう人。月の途中の変更は、翌月の項として足す。 */
export type AllowanceTerm = {
  year: number;
  month: number;
  memberIds: string[];
};

export type StoredState = {
  version: 1;
  currentUserId: string | null;
  /** 住人の部屋と名前。未保存のときは初期の4人。 */
  roster: MemberProfile[];
  /** メンバーIDごとの役割。無い人は住人として扱う。 */
  roles: Record<string, Role>;
  /** 管理者手当の対象。未保存のときは、今の管理者を最初からとして扱う。 */
  allowanceSchedule: AllowanceTerm[];
  shifts: Record<string, ShiftRecord>;
};

export type ActionResult =
  | { ok: true }
  | { ok: false; reason: string };
