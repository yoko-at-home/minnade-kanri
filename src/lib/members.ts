import type { Member } from "@/lib/types";

export const PASSPHRASE = "1234";

export const MEMBERS: Member[] = [
  { id: "iwasaki", room: "306", name: "岩崎", role: "admin" },
  { id: "funamoto", room: "309", name: "船本", role: "resident" },
  { id: "morimoto", room: "203", name: "森本", role: "resident" },
  { id: "matsuura", room: "505", name: "松浦", role: "resident" },
];

export function findMember(id: string | null | undefined): Member | undefined {
  if (!id) return undefined;
  return MEMBERS.find((member) => member.id === id);
}

export function displayName(member: Member): string {
  return `${member.room} ${member.name}`;
}

export function memberLabel(member: Member): string {
  const role = member.role === "admin" ? "（管理者）" : "";
  return `${displayName(member)}${role}`;
}
