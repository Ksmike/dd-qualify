import { describe, it, expect, vi } from "vitest";

const mockHandlers = {
  GET: vi.fn(),
  POST: vi.fn(),
};

vi.mock("@/lib/auth", () => ({
  handlers: mockHandlers,
}));

describe("auth API route", () => {
  it("exports GET and POST handlers", async () => {
    const route = await import("@/app/api/auth/[...nextauth]/route");
    expect(route.GET).toBe(mockHandlers.GET);
    expect(route.POST).toBe(mockHandlers.POST);
  });

  it("exports dynamic = force-dynamic", async () => {
    const route = await import("@/app/api/auth/[...nextauth]/route");
    expect(route.dynamic).toBe("force-dynamic");
  });
});
