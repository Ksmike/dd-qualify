import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Provider, createStore } from "jotai";

const mockThemeStorageSet = vi.fn();

vi.mock("@/lib/storage", () => ({
  themeStorage: {
    get: vi.fn().mockReturnValue(null),
    set: (...args: unknown[]) => mockThemeStorageSet(...args),
    remove: vi.fn(),
  },
}));

vi.mock("react-icons/fi", () => ({
  FiSun: () => <span data-testid="icon-sun" />,
  FiMoon: () => <span data-testid="icon-moon" />,
}));

const { ThemeSwitcher } = await import("@/components/ThemeSwitcher");
const { themeAtom } = await import("@/lib/atoms/theme");

function renderWithAtom(initialTheme: "light" | "dark") {
  const store = createStore();
  store.set(themeAtom, initialTheme);
  return render(
    <Provider store={store}>
      <ThemeSwitcher />
    </Provider>
  );
}

describe("ThemeSwitcher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders moon icon in light mode", () => {
    renderWithAtom("light");
    expect(screen.getByTestId("icon-moon")).toBeInTheDocument();
  });

  it("renders sun icon in dark mode", () => {
    renderWithAtom("dark");
    expect(screen.getByTestId("icon-sun")).toBeInTheDocument();
  });

  it("has correct aria-label in light mode", () => {
    renderWithAtom("light");
    expect(
      screen.getByRole("button", { name: "Switch to dark mode" })
    ).toBeInTheDocument();
  });

  it("has correct aria-label in dark mode", () => {
    renderWithAtom("dark");
    expect(
      screen.getByRole("button", { name: "Switch to light mode" })
    ).toBeInTheDocument();
  });

  it("toggles from light to dark and persists to storage", () => {
    renderWithAtom("light");

    fireEvent.click(screen.getByRole("button", { name: "Switch to dark mode" }));

    expect(mockThemeStorageSet).toHaveBeenCalledWith("dark");
  });

  it("toggles from dark to light and persists to storage", () => {
    renderWithAtom("dark");

    fireEvent.click(screen.getByRole("button", { name: "Switch to light mode" }));

    expect(mockThemeStorageSet).toHaveBeenCalledWith("light");
  });

  it("applies custom className when provided", () => {
    const store = createStore();
    store.set(themeAtom, "light");
    render(
      <Provider store={store}>
        <ThemeSwitcher className="custom-class" />
      </Provider>
    );

    const button = screen.getByRole("button");
    expect(button.className).toContain("custom-class");
  });

  it("uses default className when none provided", () => {
    renderWithAtom("light");

    const button = screen.getByRole("button");
    expect(button.className).toContain("text-foreground/40");
  });
});
