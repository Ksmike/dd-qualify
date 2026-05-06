import { describe, it, expect, vi, beforeEach } from "vitest";
import bcrypt from "bcryptjs";

// Mock dependencies
vi.mock("bcryptjs", () => ({
  default: {
    compare: vi.fn(),
  },
}));

const mockFindUnique = vi.fn();
vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: mockFindUnique,
    },
  },
}));

vi.mock("@auth/prisma-adapter", () => ({
  PrismaAdapter: vi.fn().mockReturnValue({}),
}));

// Capture the authorize function from Credentials provider
let authorizeFunction: (credentials: Record<string, unknown>) => Promise<unknown>;

vi.mock("next-auth/providers/credentials", () => ({
  default: vi.fn().mockImplementation((config) => {
    authorizeFunction = config.authorize;
    return { ...config, type: "credentials" };
  }),
}));

vi.mock("next-auth", () => ({
  default: vi.fn().mockImplementation((config) => {
    // Trigger provider initialization to capture authorize
    config.providers?.forEach((p: unknown) => p);
    return {
      handlers: { GET: vi.fn(), POST: vi.fn() },
      auth: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
    };
  }),
}));

// Import auth to trigger the module and capture authorize
await import("@/lib/auth");

describe("Credentials authorize", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when email is missing", async () => {
    const result = await authorizeFunction({ password: "test123" });
    expect(result).toBeNull();
  });

  it("returns null when password is missing", async () => {
    const result = await authorizeFunction({ email: "test@example.com" });
    expect(result).toBeNull();
  });

  it("returns null when credentials are empty", async () => {
    const result = await authorizeFunction({});
    expect(result).toBeNull();
  });

  it("returns null when user is not found", async () => {
    mockFindUnique.mockResolvedValue(null);

    const result = await authorizeFunction({
      email: "test@example.com",
      password: "password123",
    });

    expect(result).toBeNull();
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { email: "test@example.com" },
    });
  });

  it("returns null when user has no password (OAuth user)", async () => {
    mockFindUnique.mockResolvedValue({
      id: "1",
      email: "test@example.com",
      password: null,
    });

    const result = await authorizeFunction({
      email: "test@example.com",
      password: "password123",
    });

    expect(result).toBeNull();
  });

  it("returns null when password does not match", async () => {
    mockFindUnique.mockResolvedValue({
      id: "1",
      email: "test@example.com",
      password: "hashed_password",
      name: "Test",
      image: null,
    });
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

    const result = await authorizeFunction({
      email: "test@example.com",
      password: "wrongpassword",
    });

    expect(result).toBeNull();
  });

  it("returns user object when credentials are valid", async () => {
    mockFindUnique.mockResolvedValue({
      id: "user-1",
      email: "test@example.com",
      password: "hashed_password",
      name: "Test User",
      image: "https://example.com/avatar.png",
    });
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

    const result = await authorizeFunction({
      email: "test@example.com",
      password: "password123",
    });

    expect(result).toEqual({
      id: "user-1",
      email: "test@example.com",
      name: "Test User",
      image: "https://example.com/avatar.png",
    });
  });
});
