import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("crypto", () => {
  const TEST_KEY = "a".repeat(64); // 64 hex chars = 32 bytes

  beforeEach(() => {
    vi.stubEnv("ENCRYPTION_KEY", TEST_KEY);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("encrypts and decrypts a string round-trip", async () => {
    const { encrypt, decrypt } = await import("@/lib/crypto");

    const plaintext = "sk-secret-api-key-12345";
    const encrypted = encrypt(plaintext);
    const decrypted = decrypt(encrypted);

    expect(decrypted).toBe(plaintext);
  });

  it("produces colon-delimited format (iv:authTag:ciphertext)", async () => {
    const { encrypt } = await import("@/lib/crypto");

    const encrypted = encrypt("hello");
    const parts = encrypted.split(":");

    expect(parts).toHaveLength(3);
    // IV is 12 bytes = 24 hex chars
    expect(parts[0]).toHaveLength(24);
    // Auth tag is 16 bytes = 32 hex chars
    expect(parts[1]).toHaveLength(32);
    // Ciphertext is non-empty
    expect(parts[2].length).toBeGreaterThan(0);
  });

  it("produces different ciphertexts for the same plaintext (random IV)", async () => {
    const { encrypt } = await import("@/lib/crypto");

    const encrypted1 = encrypt("same-text");
    const encrypted2 = encrypt("same-text");

    expect(encrypted1).not.toBe(encrypted2);
  });

  it("throws on invalid encrypted value format", async () => {
    const { decrypt } = await import("@/lib/crypto");

    expect(() => decrypt("invalid")).toThrow("Invalid encrypted value format");
    expect(() => decrypt("a:b")).toThrow("Invalid encrypted value format");
  });

  it("throws when ENCRYPTION_KEY is missing", async () => {
    vi.stubEnv("ENCRYPTION_KEY", "");
    vi.resetModules();

    const { encrypt } = await import("@/lib/crypto");

    expect(() => encrypt("test")).toThrow("ENCRYPTION_KEY must be a 64-character hex string");
  });

  it("throws when ENCRYPTION_KEY is wrong length", async () => {
    vi.stubEnv("ENCRYPTION_KEY", "abcd1234");
    vi.resetModules();

    const { encrypt } = await import("@/lib/crypto");

    expect(() => encrypt("test")).toThrow("ENCRYPTION_KEY must be a 64-character hex string");
  });

  it("handles empty string encryption", async () => {
    const { encrypt, decrypt } = await import("@/lib/crypto");

    const encrypted = encrypt("");
    const decrypted = decrypt(encrypted);

    expect(decrypted).toBe("");
  });

  it("handles unicode text", async () => {
    const { encrypt, decrypt } = await import("@/lib/crypto");

    const plaintext = "Hello 🌍 世界";
    const encrypted = encrypt(plaintext);
    const decrypted = decrypt(encrypted);

    expect(decrypted).toBe(plaintext);
  });
});
