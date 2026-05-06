"use client";

import { useEffect } from "react";
import { useSetAtom } from "jotai";
import { sessionUserAtom, sessionLoadingAtom } from "@/lib/atoms/session";
import type { SessionUser } from "@/lib/atoms/session";

/**
 * Syncs the server-fetched session into Jotai atoms.
 * Rendered once in the app layout with the session passed from the server.
 */
export function SessionSync({ user }: { user: SessionUser | null }) {
  const setUser = useSetAtom(sessionUserAtom);
  const setLoading = useSetAtom(sessionLoadingAtom);

  useEffect(() => {
    setUser(user);
    setLoading(false);
  }, [user, setUser, setLoading]);

  return null;
}
