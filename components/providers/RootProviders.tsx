"use client";

import { Provider as JotaiProvider } from "jotai";
import { ThemeProvider } from "./ThemeProvider";

/**
 * Root-level client providers — wraps the entire app so both marketing
 * and app-shell pages share the same Jotai store and theme atom.
 */
export function RootProviders({ children }: { children: React.ReactNode }) {
  return (
    <JotaiProvider>
      <ThemeProvider>{children}</ThemeProvider>
    </JotaiProvider>
  );
}
