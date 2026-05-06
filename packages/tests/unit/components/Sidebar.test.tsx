import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { Sidebar } from "@/components/Sidebar";

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

describe("Sidebar — default nav", () => {
  it("renders Dashboard link", () => {
    mockPathname.mockReturnValue("/dashboard");
    render(<Sidebar />);
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute("href", "/dashboard");
  });

  it("renders Settings link", () => {
    mockPathname.mockReturnValue("/dashboard");
    render(<Sidebar />);
    expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute("href", "/settings");
  });

  it("renders Sign out button", () => {
    mockPathname.mockReturnValue("/dashboard");
    render(<Sidebar />);
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
  });
});

describe("Sidebar — project nav", () => {
  it("renders project sub-nav links when on a project route", async () => {
    mockPathname.mockReturnValue("/project/p-1");
    render(<Sidebar />);
    expect(screen.getByRole("link", { name: "General" })).toHaveAttribute("href", "/project/p-1");
    expect(screen.getByRole("link", { name: "Insights" })).toHaveAttribute("href", "/project/p-1/insights");
    expect(screen.getByRole("link", { name: "Tasks" })).toHaveAttribute("href", "/project/p-1/tasks");
    expect(screen.getByRole("link", { name: "Report" })).toHaveAttribute("href", "/project/p-1/report");
  });

  it("shows the project name once loaded", async () => {
    mockPathname.mockReturnValue("/project/p-1");
    render(<Sidebar />);
    await waitFor(() => expect(screen.getByText("Alpha Project")).toBeInTheDocument());
  });

  it("renders a back link to /dashboard", () => {
    mockPathname.mockReturnValue("/project/p-1");
    render(<Sidebar />);
    expect(screen.getByRole("link", { name: /Projects/i })).toHaveAttribute("href", "/dashboard");
  });
});
