import { describe, it, expect, vi, beforeEach } from "vitest";

const mockUserApiKey = {
  findMany: vi.fn(),
  findUnique: vi.fn(),
  findFirst: vi.fn(),
};

vi.mock("@/lib/db", () => ({
  db: {
    userApiKey: mockUserApiKey,
  },
}));

const mockDecrypt = vi.fn();
const mockEncrypt = vi.fn();
vi.mock("@/lib/crypto", () => ({
  decrypt: mockDecrypt,
  encrypt: mockEncrypt,
}));

vi.mock("@/lib/generated/prisma/client", () => ({
  ApiKeyProvider: { OPENAI: "OPENAI", ANTHROPIC: "ANTHROPIC", GOOGLE: "GOOGLE" },
}));

const { UserApiKeyModel } = await import("@/lib/models/UserApiKeyModel");

describe("UserApiKeyModel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("findForUser", () => {
    it("returns the key record for a given provider", async () => {
      const record = {
        id: "key-1",
        provider: "OPENAI",
        encryptedKey: "enc:abc",
        keyHint: "1234",
        defaultModel: "gpt-4o-mini",
        enabled: true,
      };
      mockUserApiKey.findUnique.mockResolvedValue(record);

      const result = await UserApiKeyModel.findForUser({
        userId: "user-1",
        provider: "OPENAI",
      });

      expect(result).toEqual(record);
      expect(mockUserApiKey.findUnique).toHaveBeenCalledWith({
        where: {
          userId_provider: {
            userId: "user-1",
            provider: "OPENAI",
          },
        },
      });
    });

    it("returns null when no key exists for provider", async () => {
      mockUserApiKey.findUnique.mockResolvedValue(null);

      const result = await UserApiKeyModel.findForUser({
        userId: "user-1",
        provider: "ANTHROPIC",
      });

      expect(result).toBeNull();
    });
  });

  describe("findByIdForUser", () => {
    it("returns the key record by id and userId", async () => {
      const record = {
        id: "key-1",
        provider: "OPENAI",
        encryptedKey: "enc:abc",
        userId: "user-1",
      };
      mockUserApiKey.findFirst.mockResolvedValue(record);

      const result = await UserApiKeyModel.findByIdForUser({
        userId: "user-1",
        userApiKeyId: "key-1",
      });

      expect(result).toEqual(record);
      expect(mockUserApiKey.findFirst).toHaveBeenCalledWith({
        where: {
          id: "key-1",
          userId: "user-1",
        },
      });
    });

    it("returns null when key is not found", async () => {
      mockUserApiKey.findFirst.mockResolvedValue(null);

      const result = await UserApiKeyModel.findByIdForUser({
        userId: "user-1",
        userApiKeyId: "missing",
      });

      expect(result).toBeNull();
    });
  });

  describe("decryptApiKey", () => {
    it("calls decrypt with the encrypted key", () => {
      mockDecrypt.mockReturnValue("sk-real-key");

      const result = UserApiKeyModel.decryptApiKey("enc:abc");

      expect(result).toBe("sk-real-key");
      expect(mockDecrypt).toHaveBeenCalledWith("enc:abc");
    });
  });

  describe("encryptApiKey", () => {
    it("calls encrypt with the raw key", () => {
      mockEncrypt.mockReturnValue("enc:xyz");

      const result = UserApiKeyModel.encryptApiKey("sk-raw-key");

      expect(result).toBe("enc:xyz");
      expect(mockEncrypt).toHaveBeenCalledWith("sk-raw-key");
    });
  });
});
