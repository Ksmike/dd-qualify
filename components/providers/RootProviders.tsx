"use client";

import { Suspense } from "react";
import { Provider as JotaiProvider } from "jotai";
import { NavigationProgress } from "@/components/NavigationProgress";
import { ThemeProvider } from "./ThemeProvider";

/**
 * Root-level client providers — wraps the entire app so both marketing
 * and app-shell pages share the same Jotai store and theme atom.
 */
export function RootProviders({ children }: { children: React.ReactNode }) {
  return (
    <JotaiProvider>
      <ThemeProvider>
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        {children}
      </ThemeProvider>
    </JotaiProvider>
  );
}
