import { describe, it, expect, vi } from "vitest";

// Mock dependencies before importing auth
vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("next-auth", () => ({
  default: vi.fn().mockReturnValue({
    handlers: { GET: vi.fn(), POST: vi.fn() },
    auth: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
  }),
}));

vi.mock("@auth/prisma-adapter", () => ({
  PrismaAdapter: vi.fn().mockReturnValue({}),
}));

vi.mock("next-auth/providers/credentials", () => ({
  default: vi.fn().mockImplementation((config) => ({
    ...config,
    type: "credentials",
  })),
}));

vi.mock("bcryptjs", () => ({
  default: {
    compare: vi.fn(),
  },
}));

describe("auth config", () => {
  it("exports handlers, auth, signIn, signOut", async () => {
    const authModule = await import("@/lib/auth");
    expect(authModule.handlers).toBeDefined();
    expect(authModule.auth).toBeDefined();
    expect(authModule.signIn).toBeDefined();
    expect(authModule.signOut).toBeDefined();
  });
});

describe("auth.config", () => {
  it("exports authConfig with signIn page set to /login", async () => {
    const { authConfig } = await import("@/lib/auth.config");
    expect(authConfig.pages?.signIn).toBe("/login");
  });

  it("has jwt callback that adds user id to token", async () => {
    const { authConfig } = await import("@/lib/auth.config");
    const jwtCallback = authConfig.callbacks?.jwt;
    expect(jwtCallback).toBeDefined();

    const token = { sub: "123" };
    const user = { id: "user-1" };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await jwtCallback!({ token, user } as any);
    expect(result.id).toBe("user-1");
  });

  it("jwt callback returns token unchanged when no user", async () => {
    const { authConfig } = await import("@/lib/auth.config");
    const jwtCallback = authConfig.callbacks?.jwt;

    const token = { sub: "123", id: "existing" };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await jwtCallback!({ token, user: undefined } as any);
    expect(result.id).toBe("existing");
  });

  it("has session callback that adds id to session.user", async () => {
    const { authConfig } = await import("@/lib/auth.config");
    const sessionCallback = authConfig.callbacks?.session;
    expect(sessionCallback).toBeDefined();

    const session = { user: { id: "" } };
    const token = { id: "user-1" };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await sessionCallback!({ session, token } as any);
    expect(result.user.id).toBe("user-1");
  });
});
