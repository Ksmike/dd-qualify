"use client";

import { ToastProvider } from "@heroui/react";
import { SessionSync } from "./SessionSync";
import { toastConfig } from "@/config/toast";
import type { SessionUser } from "@/lib/atoms/session";

// JotaiProvider lives in RootProviders (app/layout.tsx) so both app and
// marketing pages share the same atom store (theme, session, etc.).
export function Providers({
  children,
  user,
}: {
  children: React.ReactNode;
  user: SessionUser | null;
}) {
  return (
    <>
      <SessionSync user={user} />
      {children}
      <ToastProvider {...toastConfig} />
    </>
  );
}
