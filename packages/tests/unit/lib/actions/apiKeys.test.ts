import { describe, it, expect, vi, beforeEach } from "vitest";

const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

const mockListForUser = vi.fn();
vi.mock("@/lib/models/UserApiKeyModel", () => ({
  UserApiKeyModel: {
    listForUser: mockListForUser,
    findForUser: vi.fn(),
    findByIdForUser: vi.fn(),
    decryptApiKey: vi.fn(),
    encryptApiKey: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({
  db: {
    userApiKey: {
      upsert: vi.fn(),
      deleteMany: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/generated/prisma/client", () => ({
  ApiKeyProvider: { OPENAI: "OPENAI", ANTHROPIC: "ANTHROPIC", GOOGLE: "GOOGLE" },
}));

vi.mock("@/lib/diligence/model-provider", () => ({
  ModelProviderRegistry: class {},
}));

vi.mock("@/lib/diligence/model-router", () => ({
  defaultModelForProvider: (provider: string) => {
    const defaults: Record<string, string> = {
      OPENAI: "gpt-4o-mini",
      ANTHROPIC: "claude-3-5-sonnet-latest",
      GOOGLE: "gemini-2.5-flash",
    };
    return defaults[provider] ?? "unknown";
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const { getApiKeyStatuses } = await import("@/lib/actions/apiKeys");

describe("getApiKeyStatuses", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns default statuses when user is not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const result = await getApiKeyStatuses();

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({
      id: null,
      provider: "OPENAI",
      isSet: false,
      hint: null,
      defaultModel: "gpt-4o-mini",
      enabled: false,
      lastValidatedAt: null,
    });
    expect(result[1].provider).toBe("ANTHROPIC");
    expect(result[2].provider).toBe("GOOGLE");
  });

  it("returns default statuses when session has no user id", async () => {
    mockAuth.mockResolvedValue({ user: {} });

    const result = await getApiKeyStatuses();

    expect(result).toHaveLength(3);
    result.forEach((status) => {
      expect(status.isSet).toBe(false);
      expect(status.enabled).toBe(false);
    });
  });

  it("returns statuses with user keys when authenticated", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockListForUser.mockResolvedValue([
      {
        id: "key-1",
        provider: "OPENAI",
        keyHint: "abcd",
        defaultModel: "gpt-4o",
        enabled: true,
        lastValidatedAt: new Date("2024-06-01T00:00:00Z"),
      },
    ]);

    const result = await getApiKeyStatuses();

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({
      id: "key-1",
      provider: "OPENAI",
      isSet: true,
      hint: "abcd",
      defaultModel: "gpt-4o",
      enabled: true,
      lastValidatedAt: "2024-06-01T00:00:00.000Z",
    });
    // Providers without keys
    expect(result[1]).toEqual({
      id: null,
      provider: "ANTHROPIC",
      isSet: false,
      hint: null,
      defaultModel: "claude-3-5-sonnet-latest",
      enabled: false,
      lastValidatedAt: null,
    });
  });

  it("uses defaultModelForProvider when key has no defaultModel", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockListForUser.mockResolvedValue([
      {
        id: "key-2",
        provider: "GOOGLE",
        keyHint: "wxyz",
        defaultModel: null,
        enabled: true,
        lastValidatedAt: null,
      },
    ]);

    const result = await getApiKeyStatuses();

    const googleStatus = result.find((s) => s.provider === "GOOGLE");
    expect(googleStatus?.defaultModel).toBe("gemini-2.5-flash");
  });
});
