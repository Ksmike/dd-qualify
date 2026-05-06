"use client";

import { Provider as JotaiProvider } from "jotai";
import { SessionSync } from "./SessionSync";
import type { SessionUser } from "@/lib/atoms/session";

export function Providers({
  children,
  user,
}: {
  children: React.ReactNode;
  user: SessionUser | null;
}) {
  return (
    <JotaiProvider>
      <SessionSync user={user} />
      {children}
    </JotaiProvider>
  );
}
