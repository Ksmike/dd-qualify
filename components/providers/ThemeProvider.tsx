"use client";

import { useEffect } from "react";
import { useAtom } from "jotai";
import { themeAtom } from "@/lib/atoms/theme";
import { themeStorage } from "@/lib/storage";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useAtom(themeAtom);

  // Hydrate atom from localStorage on first mount
  useEffect(() => {
    const stored = themeStorage.get();
    if (stored && stored !== theme) setTheme(stored);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Apply/remove .dark class on <html> whenever the atom changes
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
    } else {
      root.classList.remove("dark");
      root.classList.add("light");
    }
  }, [theme]);

  return <>{children}</>;
}
