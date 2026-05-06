import { describe, it, expect, vi, beforeEach } from "vitest";

// Use class-based mocks so `new` works correctly
vi.mock("@/lib/generated/prisma/client", () => ({
  PrismaClient: class MockPrismaClient {
    adapter: unknown;
    constructor(opts: { adapter: unknown }) {
      this.adapter = opts.adapter;
    }
  },
}));

vi.mock("@prisma/adapter-pg", () => ({
  PrismaPg: class MockPrismaPg {
    connectionString: string;
    constructor(opts: { connectionString: string }) {
      this.connectionString = opts.connectionString;
    }
  },
}));

vi.mock("@/config", () => ({
  config: {
    database: {
      url: "postgresql://test:test@localhost:5432/testdb",
    },
  },
}));

describe("db", () => {
  beforeEach(() => {
    vi.resetModules();
    // Re-mock after reset
    vi.mock("@/lib/generated/prisma/client", () => ({
      PrismaClient: class MockPrismaClient {
        adapter: unknown;
        constructor(opts: { adapter: unknown }) {
          this.adapter = opts.adapter;
        }
      },
    }));
    vi.mock("@prisma/adapter-pg", () => ({
      PrismaPg: class MockPrismaPg {
        connectionString: string;
        constructor(opts: { connectionString: string }) {
          this.connectionString = opts.connectionString;
        }
      },
    }));
    vi.mock("@/config", () => ({
      config: {
        database: {
          url: "postgresql://test:test@localhost:5432/testdb",
        },
      },
    }));
    // Clear global singleton
    const g = globalThis as unknown as { prisma: unknown };
    delete g.prisma;
  });

  it("creates a PrismaClient with PrismaPg adapter", async () => {
    const { db } = await import("@/lib/db");

    // Verify the adapter was created with the connection string from config
    expect((db as unknown as { adapter: { connectionString: string } }).adapter.connectionString).toBe(
      "postgresql://test:test@localhost:5432/testdb"
    );
  });

  it("exports a db instance", async () => {
    const { db } = await import("@/lib/db");
    expect(db).toBeDefined();
  });

  it("reuses existing global instance in development", async () => {
    vi.stubEnv("NODE_ENV", "development");

    const existingClient = { _existing: true };
    const g = globalThis as unknown as { prisma: unknown };
    g.prisma = existingClient;

    const { db } = await import("@/lib/db");
    expect(db).toBe(existingClient);
  });
});
