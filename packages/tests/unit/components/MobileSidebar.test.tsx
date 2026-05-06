import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MobileSidebar } from "@/components/MobileSidebar";

vi.mock("@/lib/actions/auth", () => ({
  logout: vi.fn(),
}));

const mockPathname = vi.fn().mockReturnValue("/dashboard");
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname(),
}));

vi.mock("@/lib/actions/sidebar", () => ({
  getProjectForSidebar: vi.fn().mockResolvedValue({ id: "p-1", name: "Alpha Project" }),
}));

describe("MobileSidebar — default nav", () => {
  it("renders hamburger button", () => {
    mockPathname.mockReturnValue("/dashboard");
    render(<MobileSidebar />);
    expect(screen.getByRole("button", { name: "Open menu" })).toBeInTheDocument();
  });

  it("opens sidebar on hamburger click", async () => {
    mockPathname.mockReturnValue("/dashboard");
    render(<MobileSidebar />);
    await userEvent.click(screen.getByRole("button", { name: "Open menu" }));
    expect(screen.getByRole("link", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Settings" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
  });

  it("closes sidebar on close button click", async () => {
    mockPathname.mockReturnValue("/dashboard");
    render(<MobileSidebar />);
    await userEvent.click(screen.getByRole("button", { name: "Open menu" }));
    await userEvent.click(screen.getByRole("button", { name: "Close menu" }));
    const aside = screen.getByRole("complementary", { hidden: true });
    expect(aside.className).toContain("-translate-x-full");
  });
});

describe("MobileSidebar — project nav", () => {
  it("shows project sub-nav when on a project route", async () => {
    mockPathname.mockReturnValue("/project/p-1");
    render(<MobileSidebar />);
    await userEvent.click(screen.getByRole("button", { name: "Open menu" }));
    expect(screen.getByRole("link", { name: "General" })).toHaveAttribute("href", "/project/p-1");
    expect(screen.getByRole("link", { name: "Insights" })).toHaveAttribute("href", "/project/p-1/insights");
    expect(screen.getByRole("link", { name: "Tasks" })).toHaveAttribute("href", "/project/p-1/tasks");
    expect(screen.getByRole("link", { name: "Report" })).toHaveAttribute("href", "/project/p-1/report");
  });

  it("shows the project name once loaded", async () => {
    mockPathname.mockReturnValue("/project/p-1");
    render(<MobileSidebar />);
    await userEvent.click(screen.getByRole("button", { name: "Open menu" }));
    await waitFor(() => expect(screen.getByText("Alpha Project")).toBeInTheDocument());
  });

  it("renders a back link to /dashboard", async () => {
    mockPathname.mockReturnValue("/project/p-1");
    render(<MobileSidebar />);
    await userEvent.click(screen.getByRole("button", { name: "Open menu" }));
    expect(screen.getByRole("link", { name: /Projects/i })).toHaveAttribute("href", "/dashboard");
  });
});
