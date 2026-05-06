"use client";

import { useAtomValue } from "jotai";
import { sessionUserAtom, sessionLoadingAtom } from "@/lib/atoms/session";

/**
 * Access the current session user from any client component
 * within the Providers tree.
 *
 * @example
 * const { user, loading } = useSession();
 * if (loading) return <Spinner />;
 * if (!user) redirect("/login");
 */
export function useSession() {
  const user = useAtomValue(sessionUserAtom);
  const loading = useAtomValue(sessionLoadingAtom);
  return { user, loading };
}
