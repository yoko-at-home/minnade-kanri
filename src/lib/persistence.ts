import type { StoredState } from "@/lib/types";

/**
 * フェーズ1の保存先。フェーズ2ではこのファイルだけを Firestore 実装に差し替える。
 * 入出力は StoredState（ユーザーIDと日付キーのシフト）のままにする。
 */
const STORAGE_KEY = "minnade-kanri:v2";

export type ShiftStore = {
  load(): StoredState | null;
  save(state: StoredState): void;
  clear(): void;
};

function isStoredState(value: unknown): value is StoredState {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<StoredState>;
  return record.version === 1 && typeof record.shifts === "object" && record.shifts !== null;
}

export const localShiftStore: ShiftStore = {
  load() {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed: unknown = JSON.parse(raw);
      return isStoredState(parsed) ? parsed : null;
    } catch {
      return null;
    }
  },
  save(state) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  },
  clear() {
    window.localStorage.removeItem(STORAGE_KEY);
  },
};
