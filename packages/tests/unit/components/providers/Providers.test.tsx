import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { useAtomValue } from "jotai";
import { Providers } from "@/components/providers/Providers";
import { sessionUserAtom, sessionLoadingAtom } from "@/lib/atoms/session";

// Helper component to read atom values in tests
function SessionDisplay() {
  const user = useAtomValue(sessionUserAtom);
  const loading = useAtomValue(sessionLoadingAtom);
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="user">{user ? user.email : "none"}</span>
    </div>
  );
}

describe("Providers", () => {
  it("renders children", () => {
    render(
      <Providers user={null}>
        <p>child content</p>
      </Providers>
    );
    expect(screen.getByText("child content")).toBeInTheDocument();
  });

  it("syncs user into session atoms", () => {
    const user = { id: "1", name: "Test", email: "test@example.com", image: null };
    render(
      <Providers user={user}>
        <SessionDisplay />
      </Providers>
    );
    expect(screen.getByTestId("user")).toHaveTextContent("test@example.com");
    expect(screen.getByTestId("loading")).toHaveTextContent("false");
  });

  it("sets user to null when no session", () => {
    render(
      <Providers user={null}>
        <SessionDisplay />
      </Providers>
    );
    expect(screen.getByTestId("user")).toHaveTextContent("none");
    expect(screen.getByTestId("loading")).toHaveTextContent("false");
  });
});
