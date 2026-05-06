/**
 * Type-safe localStorage utility.
 *
 * Usage:
 *   const themeStorage = createStorageKey<Theme>("dd:theme", (v) => v === "dark" ? "dark" : "light");
 *   themeStorage.get()   // Theme | null
 *   themeStorage.set("dark")
 *   themeStorage.remove()
 */

export type StorageKey<T> = {
  /** Returns the stored value, or null if absent / SSR / parse error. */
  get(): T | null;
  /** Writes the value. No-ops on SSR or quota errors. */
  set(value: T): void;
  /** Removes the key. No-ops on SSR. */
  remove(): void;
};

export function createStorageKey<T>(
  key: string,
  parse: (raw: string) => T,
  serialize: (value: T) => string = String
): StorageKey<T> {
  return {
    get() {
      if (typeof window === "undefined") return null;
      try {
        const raw = localStorage.getItem(key);
        return raw !== null ? parse(raw) : null;
      } catch {
        return null;
      }
    },
    set(value) {
      if (typeof window === "undefined") return;
      try {
        localStorage.setItem(key, serialize(value));
      } catch {
        // quota exceeded or private browsing — fail silently
      }
    },
    remove() {
      if (typeof window === "undefined") return;
      try {
        localStorage.removeItem(key);
      } catch {}
    },
  };
}

// ─── App storage keys ─────────────────────────────────────────────────────────

export type Theme = "light" | "dark";

export const themeStorage = createStorageKey<Theme>(
  "dd:theme",
  (raw) => (raw === "dark" ? "dark" : "light"),
  (v) => v
);
