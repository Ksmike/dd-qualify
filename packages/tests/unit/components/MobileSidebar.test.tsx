import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MobileSidebar } from "@/components/MobileSidebar";

vi.mock("@/lib/actions/auth", () => ({
  logout: vi.fn(),
}));

describe("MobileSidebar", () => {
  it("renders hamburger button", () => {
    render(<MobileSidebar />);
    expect(screen.getByRole("button", { name: "Open menu" })).toBeInTheDocument();
  });

  it("opens sidebar on hamburger click", async () => {
    render(<MobileSidebar />);
    await userEvent.click(screen.getByRole("button", { name: "Open menu" }));
    expect(screen.getByRole("link", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Settings" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
  });

  it("closes sidebar on close button click", async () => {
    render(<MobileSidebar />);
    await userEvent.click(screen.getByRole("button", { name: "Open menu" }));
    await userEvent.click(screen.getByRole("button", { name: "Close menu" }));
    // Panel should be off-screen (translated away)
    const aside = screen.getByRole("complementary", { hidden: true });
    expect(aside.className).toContain("-translate-x-full");
  });
});
