import type { AccountType, Member, MemberProfile, Role } from "@/lib/types";

export const PASSPHRASE = "1234";

const EMPTY_ACCOUNT = {
  bankName: "",
  branchName: "",
  accountType: "" as AccountType,
  accountNumber: "",
  accountHolder: "",
};

export const DEFAULT_ROSTER: MemberProfile[] = [
  { id: "iwasaki", room: "306", name: "岩崎", systemAdmin: true, ...EMPTY_ACCOUNT },
  { id: "funamoto", room: "309", name: "船本", systemAdmin: false, ...EMPTY_ACCOUNT },
  { id: "morimoto", room: "20x", name: "▲▲", systemAdmin: false, ...EMPTY_ACCOUNT },
  { id: "matsuura", room: "505", name: "松浦", systemAdmin: false, ...EMPTY_ACCOUNT },
];

const DEFAULT_ROLE_BY_ID: Record<string, Role> = {
  iwasaki: "resident",
  funamoto: "resident",
  morimoto: "resident",
  matsuura: "admin",
};

export const DEFAULT_ROLES: Record<string, Role> = Object.fromEntries(
  DEFAULT_ROSTER.map((entry) => [entry.id, DEFAULT_ROLE_BY_ID[entry.id] ?? "resident"]),
);

function accountFrom(value: unknown) {
  const record = value && typeof value === "object" ? (value as Partial<MemberProfile>) : {};
  const accountType: AccountType =
    record.accountType === "ordinary" || record.accountType === "checking" ? record.accountType : "";
  return {
    bankName: typeof record.bankName === "string" ? record.bankName.trim().slice(0, 30) : "",
    branchName: typeof record.branchName === "string" ? record.branchName.trim().slice(0, 30) : "",
    accountType,
    accountNumber:
      typeof record.accountNumber === "string"
        ? record.accountNumber.replace(/[\s-]/g, "").replace(/\D/g, "").slice(0, 8)
        : "",
    accountHolder:
      typeof record.accountHolder === "string" ? record.accountHolder.trim().slice(0, 40) : "",
  };
}

function isProfile(value: unknown): value is MemberProfile {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<MemberProfile>;
  return (
    typeof record.id === "string" &&
    record.id.trim().length > 0 &&
    typeof record.room === "string" &&
    record.room.trim().length > 0 &&
    typeof record.name === "string" &&
    record.name.trim().length > 0 &&
    typeof record.systemAdmin === "boolean"
  );
}

/** 保存済みの名簿を整える。空のときだけ初期の4人に戻す。システム管理者だけは欠けていれば戻す。 */
export function normalizeRoster(value: unknown): MemberProfile[] {
  const saved = Array.isArray(value) ? value.filter(isProfile) : [];
  if (saved.length === 0) return DEFAULT_ROSTER.map((entry) => ({ ...entry }));

  const roster: MemberProfile[] = [];
  const seen = new Set<string>();
  for (const entry of saved) {
    if (seen.has(entry.id)) continue;
    seen.add(entry.id);
    const fallback = DEFAULT_ROSTER.find((item) => item.id === entry.id);
    roster.push({
      id: entry.id.trim(),
      room: entry.room.trim().slice(0, 10),
      name: entry.name.trim().slice(0, 20),
      systemAdmin: fallback?.systemAdmin ?? false,
      ...accountFrom(entry),
    });
  }
  for (const entry of DEFAULT_ROSTER) {
    if (entry.systemAdmin && !seen.has(entry.id)) roster.unshift({ ...entry });
  }
  return roster;
}

export function normalizeRoles(value: unknown, roster: MemberProfile[]): Record<string, Role> {
  const record =
    value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const roles: Record<string, Role> = {};
  for (const entry of roster) {
    const role = record[entry.id];
    if (role === "admin" || role === "resident") {
      roles[entry.id] = role;
      continue;
    }
    roles[entry.id] = DEFAULT_ROLE_BY_ID[entry.id] === "admin" ? "admin" : "resident";
  }
  return roles;
}

export function memberFrom(profile: MemberProfile, roles: Record<string, Role>): Member {
  return {
    ...profile,
    role: roles[profile.id] === "admin" ? "admin" : "resident",
  };
}

export function membersFrom(roster: MemberProfile[], roles: Record<string, Role>): Member[] {
  return roster.map((profile) => memberFrom(profile, roles));
}

export type MemberEdits = {
  room: string;
  name: string;
  bankName: string;
  branchName: string;
  accountType: AccountType;
  accountNumber: string;
  accountHolder: string;
};

export function profileError(
  edits: MemberEdits,
  roster: MemberProfile[],
  ignoreId?: string,
): string | null {
  const roomText = edits.room.trim();
  const nameText = edits.name.trim();
  if (!roomText || !nameText) return "部屋と名前を入れてください。";
  if (roomText.length > 10) return "部屋は10文字までです。";
  if (nameText.length > 20) return "名前は20文字までです。";
  const duplicated = roster.some((entry) => entry.id !== ignoreId && entry.room === roomText);
  if (duplicated) return "その部屋はすでに登録されています。";
  if (edits.bankName.trim().length > 30) return "銀行名は30文字までです。";
  if (edits.branchName.trim().length > 30) return "支店名は30文字までです。";
  if (edits.accountHolder.trim().length > 40) return "口座名義は40文字までです。";
  const digits = edits.accountNumber.replace(/[\s-]/g, "");
  if (digits && !/^\d{1,8}$/.test(digits)) return "口座番号は8桁までの数字です。";
  if (edits.accountType !== "" && edits.accountType !== "ordinary" && edits.accountType !== "checking") {
    return "口座種別を選び直してください。";
  }
  return null;
}

export function accountTypeLabel(accountType: AccountType): string {
  if (accountType === "ordinary") return "普通";
  if (accountType === "checking") return "当座";
  return "";
}

/** 報酬カード用。銀行名と、番号があるときは下4桁だけ。 */
export function accountHint(member: Pick<Member, "bankName" | "accountNumber">): string {
  const tail = member.accountNumber.slice(-4);
  const number =
    member.accountNumber.length > 4 ? `下4桁${tail}` : member.accountNumber;
  return [member.bankName, number].filter(Boolean).join(" ");
}

export function displayName(member: Pick<Member, "room" | "name">): string {
  return `${member.room} ${member.name}`;
}

export function memberLabel(member: Member): string {
  const marks: string[] = [];
  if (member.systemAdmin) marks.push("システム管理者");
  if (member.role === "admin") marks.push("管理者");
  if (marks.length === 0) return displayName(member);
  return `${displayName(member)}（${marks.join("・")}）`;
}
