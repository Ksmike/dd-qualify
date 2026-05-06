import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock next/font/google — these are build-time transforms
vi.mock("next/font/google", () => ({
  Geist: () => ({ variable: "--font-geist-sans" }),
  Geist_Mono: () => ({ variable: "--font-geist-mono" }),
}));

describe("RootLayout", () => {
  it("renders children", async () => {
    const { default: RootLayout } = await import("@/app/layout");
    render(
      <RootLayout>
        <p>Hello World</p>
      </RootLayout>
    );
    expect(screen.getByText("Hello World")).toBeInTheDocument();
  });

  it("exports metadata with title and description", async () => {
    const { metadata } = await import("@/app/layout");
    expect(metadata.title).toBe("DD Qualify");
    expect(metadata.description).toContain("DD Qualify");
  });
});
