import type { Member, MemberProfile, Role } from "@/lib/types";

export const PASSPHRASE = "1234";

export const DEFAULT_ROSTER: MemberProfile[] = [
  { id: "iwasaki", room: "306", name: "岩崎", systemAdmin: true },
  { id: "funamoto", room: "309", name: "船本", systemAdmin: false },
  { id: "morimoto", room: "20x", name: "▲▲", systemAdmin: false },
  { id: "matsuura", room: "505", name: "松浦", systemAdmin: false },
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

/** 保存済みの名簿を整え、初期の4人が欠けていれば戻す。システム管理者は初期名簿の人だけ。 */
export function normalizeRoster(value: unknown): MemberProfile[] {
  const saved = Array.isArray(value) ? value.filter(isProfile) : [];
  const byId = new Map<string, MemberProfile>();
  for (const entry of saved) {
    if (byId.has(entry.id)) continue;
    const fallback = DEFAULT_ROSTER.find((item) => item.id === entry.id);
    byId.set(entry.id, {
      id: entry.id.trim(),
      room: entry.room.trim().slice(0, 10),
      name: entry.name.trim().slice(0, 20),
      systemAdmin: fallback?.systemAdmin ?? false,
    });
  }

  const roster: MemberProfile[] = [];
  for (const entry of DEFAULT_ROSTER) {
    roster.push(byId.get(entry.id) ?? { ...entry });
    byId.delete(entry.id);
  }
  for (const entry of saved) {
    const custom = byId.get(entry.id);
    if (!custom) continue;
    roster.push(custom);
    byId.delete(entry.id);
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

export function profileError(
  room: string,
  name: string,
  roster: MemberProfile[],
  ignoreId?: string,
): string | null {
  const roomText = room.trim();
  const nameText = name.trim();
  if (!roomText || !nameText) return "部屋と名前を入れてください。";
  if (roomText.length > 10) return "部屋は10文字までです。";
  if (nameText.length > 20) return "名前は20文字までです。";
  const duplicated = roster.some((entry) => entry.id !== ignoreId && entry.room === roomText);
  if (duplicated) return "その部屋はすでに登録されています。";
  return null;
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
