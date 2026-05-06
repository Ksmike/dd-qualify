"use client";

import { logout } from "@/lib/actions/auth";

export function LogoutButton() {
  return (
    <form action={logout}>
      <button
        type="submit"
        className="w-full rounded-md px-3 py-2 text-left text-sm font-medium text-danger transition-colors hover:bg-danger/10"
      >
        Sign out
      </button>
    </form>
  );
}
