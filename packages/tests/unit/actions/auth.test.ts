import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockDb } from "../../mocks/db";

// Mock bcryptjs
vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("hashed_password"),
    compare: vi.fn(),
  },
}));

// Mock next-auth signIn
const mockSignIn = vi.fn();
const mockSignOut = vi.fn();
vi.mock("@/lib/auth", () => ({
  signIn: mockSignIn,
  signOut: mockSignOut,
}));

// Import after mocks are set up
const { register, login, logout } = await import("@/lib/actions/auth");

function createFormData(data: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(data)) {
    formData.set(key, value);
  }
  return formData;
}

describe("register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when email is missing", async () => {
    const formData = createFormData({ password: "password123" });
    const result = await register(formData);
    expect(result).toEqual({ error: "Email and password are required" });
  });

  it("returns error when password is missing", async () => {
    const formData = createFormData({ email: "test@example.com" });
    const result = await register(formData);
    expect(result).toEqual({ error: "Email and password are required" });
  });

  it("returns error when password is too short", async () => {
    const formData = createFormData({
      email: "test@example.com",
      password: "short",
    });
    const result = await register(formData);
    expect(result).toEqual({
      error: "Password must be at least 8 characters",
    });
  });

  it("returns error when user already exists", async () => {
    mockDb.user.findUnique.mockResolvedValue({ id: "1", email: "test@example.com" });

    const formData = createFormData({
      email: "test@example.com",
      password: "password123",
    });
    const result = await register(formData);
    expect(result).toEqual({
      error: "An account with this email already exists",
    });
  });

  it("creates user and signs in on success", async () => {
    mockDb.user.findUnique.mockResolvedValue(null);
    mockDb.user.create.mockResolvedValue({
      id: "1",
      email: "test@example.com",
      name: "Test User",
    });

    const formData = createFormData({
      email: "test@example.com",
      password: "password123",
      name: "Test User",
    });

    await register(formData);

    expect(mockDb.user.create).toHaveBeenCalledWith({
      data: {
        email: "test@example.com",
        name: "Test User",
        password: "hashed_password",
        locale: "en",
      },
    });

    expect(mockSignIn).toHaveBeenCalledWith("credentials", {
      email: "test@example.com",
      password: "password123",
      redirectTo: "/dashboard",
    });
  });

  it("sets name to null when not provided", async () => {
    mockDb.user.findUnique.mockResolvedValue(null);
    mockDb.user.create.mockResolvedValue({
      id: "1",
      email: "test@example.com",
      name: null,
    });

    const formData = createFormData({
      email: "test@example.com",
      password: "password123",
    });

    await register(formData);

    expect(mockDb.user.create).toHaveBeenCalledWith({
      data: {
        email: "test@example.com",
        name: null,
        password: "hashed_password",
        locale: "en",
      },
    });
  });
});

describe("login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when email is missing", async () => {
    const formData = createFormData({ password: "password123" });
    const result = await login(formData);
    expect(result).toEqual({ error: "Email and password are required" });
  });

  it("returns error when password is missing", async () => {
    const formData = createFormData({ email: "test@example.com" });
    const result = await login(formData);
    expect(result).toEqual({ error: "Email and password are required" });
  });

  it("calls signIn with credentials", async () => {
    mockSignIn.mockResolvedValue(undefined);

    const formData = createFormData({
      email: "test@example.com",
      password: "password123",
    });

    await login(formData);

    expect(mockSignIn).toHaveBeenCalledWith("credentials", {
      email: "test@example.com",
      password: "password123",
      redirectTo: "/dashboard",
    });
  });

  it("returns error on invalid credentials", async () => {
    mockSignIn.mockRejectedValue(new Error("CredentialsSignin"));

    const formData = createFormData({
      email: "test@example.com",
      password: "wrongpassword",
    });

    const result = await login(formData);
    expect(result).toEqual({ error: "Invalid email or password" });
  });

  it("rethrows NEXT_REDIRECT errors", async () => {
    const redirectError = new Error("NEXT_REDIRECT");
    Object.assign(redirectError, { digest: "NEXT_REDIRECT;/dashboard" });

    mockSignIn.mockRejectedValue(redirectError);

    const formData = createFormData({
      email: "test@example.com",
      password: "password123",
    });

    await expect(login(formData)).rejects.toThrow("NEXT_REDIRECT");
  });
});

describe("logout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls signOut with redirect to home", async () => {
    mockSignOut.mockResolvedValue(undefined);
    await logout();
    expect(mockSignOut).toHaveBeenCalledWith({ redirectTo: "/" });
  });
});
