import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Sidebar } from "@/components/Sidebar";

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
});
