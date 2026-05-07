/**
 * Type-safe coercion utilities for working with unknown/untyped data
 * (e.g., parsed JSON from LLM responses, API payloads, metadata blobs).
 *
 * Use these instead of inline type assertions or ad-hoc casting.
 */

/** Coerce an unknown value to an array, returning [] if not an array. */
export function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

/** Coerce an unknown value to a string[], filtering out non-string entries. */
export function asStringArray(value: unknown): string[] {
  return asArray<unknown>(value).filter(
    (entry): entry is string => typeof entry === "string"
  );
}

/** Return the value as a non-empty string or null. */
export function asNullableString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

/** Return the value as a string, or a fallback if not a string. */
export function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

/** Return the value as a finite number, or null. */
export function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** Narrow an unknown value to a Record if it's a non-null object. */
export function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
