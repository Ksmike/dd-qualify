import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UserMenu } from "@/components/UserMenu";

vi.mock("@/lib/actions/auth", () => ({
  logout: vi.fn(),
}));

describe("UserMenu", () => {
  const user = { name: "Jane Doe", email: "jane@example.com", image: null };

  it("renders initials when no image", () => {
    render(<UserMenu user={user} />);
    expect(screen.getByText("JD")).toBeInTheDocument();
  });

  it("renders avatar image when provided", () => {
    render(
      <UserMenu
        user={{ ...user, image: "https://example.com/avatar.png" }}
      />
    );
    const img = screen.getByAltText("Jane Doe");
    expect(img).toHaveAttribute("src");
    expect(img.getAttribute("src")).toContain(
      encodeURIComponent("https://example.com/avatar.png")
    );
  });

  it("shows dropdown on click", async () => {
    render(<UserMenu user={user} />);
    const button = screen.getByRole("button", { name: "User menu" });
    await userEvent.click(button);
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("jane@example.com")).toBeInTheDocument();
    expect(screen.getByText("Sign out")).toBeInTheDocument();
  });

  it("hides dropdown on second click", async () => {
    render(<UserMenu user={user} />);
    const button = screen.getByRole("button", { name: "User menu" });
    await userEvent.click(button);
    expect(screen.getByText("Sign out")).toBeInTheDocument();
    await userEvent.click(button);
    expect(screen.queryByText("Sign out")).not.toBeInTheDocument();
  });

  it("uses first letter of email when no name", () => {
    render(<UserMenu user={{ name: null, email: "z@example.com", image: null }} />);
    expect(screen.getByText("Z")).toBeInTheDocument();
  });

  it("falls back to ? when no name or email", () => {
    render(<UserMenu user={{ name: null, email: null, image: null }} />);
    expect(screen.getByText("?")).toBeInTheDocument();
  });
});
