import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Provider as JotaiProvider, createStore } from "jotai";
import { useSession } from "@/lib/hooks/useSession";
import { sessionUserAtom, sessionLoadingAtom } from "@/lib/atoms/session";

function TestComponent() {
  const { user, loading } = useSession();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="user-id">{user?.id ?? "none"}</span>
    </div>
  );
}

describe("useSession", () => {
  it("returns loading true and null user by default", () => {
    render(
      <JotaiProvider>
        <TestComponent />
      </JotaiProvider>
    );
    expect(screen.getByTestId("loading")).toHaveTextContent("true");
    expect(screen.getByTestId("user-id")).toHaveTextContent("none");
  });

  it("returns user when atom is populated", () => {
    const store = createStore();
    store.set(sessionUserAtom, { id: "user-1", name: "Test", email: "t@t.com", image: null });
    store.set(sessionLoadingAtom, false);

    render(
      <JotaiProvider store={store}>
        <TestComponent />
      </JotaiProvider>
    );
    expect(screen.getByTestId("loading")).toHaveTextContent("false");
    expect(screen.getByTestId("user-id")).toHaveTextContent("user-1");
  });
});
