"use client";

import { Provider as JotaiProvider } from "jotai";
import { ToastProvider } from "@heroui/react";
import { SessionSync } from "./SessionSync";
import { toastConfig } from "@/config/toast";
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
      <ToastProvider {...toastConfig} />
    </JotaiProvider>
  );
}
