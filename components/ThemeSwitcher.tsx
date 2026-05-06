"use client";

import { useAtom } from "jotai";
import { FiSun, FiMoon } from "react-icons/fi";
import { themeAtom } from "@/lib/atoms/theme";
import { themeStorage } from "@/lib/storage";

type Props = {
  /** Extra Tailwind classes — use to adapt colours for dark/light surfaces. */
  className?: string;
};

export function ThemeSwitcher({ className }: Props) {
  const [theme, setTheme] = useAtom(themeAtom);
  const isDark = theme === "dark";

  function toggle() {
    const next = isDark ? "light" : "dark";
    setTheme(next);
    themeStorage.set(next);
  }

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
        className ??
        "text-foreground/40 hover:bg-content2 hover:text-foreground"
      }`}
    >
      {isDark ? (
        <FiSun className="h-4 w-4" />
      ) : (
        <FiMoon className="h-4 w-4" />
      )}
    </button>
  );
}
