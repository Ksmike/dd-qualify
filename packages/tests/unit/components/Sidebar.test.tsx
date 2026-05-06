import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Sidebar } from "@/components/Sidebar";

vi.mock("@/lib/actions/auth", () => ({
  logout: vi.fn(),
}));

describe("Sidebar", () => {
  it("renders Dashboard link", () => {
    render(<Sidebar />);
    const link = screen.getByRole("link", { name: "Dashboard" });
    expect(link).toHaveAttribute("href", "/dashboard");
  });

  it("renders Settings link", () => {
    render(<Sidebar />);
    const link = screen.getByRole("link", { name: "Settings" });
    expect(link).toHaveAttribute("href", "/settings");
  });

  it("renders Sign out button", () => {
    render(<Sidebar />);
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
  });
});
