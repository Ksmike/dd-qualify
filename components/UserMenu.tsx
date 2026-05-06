"use client";

import { useState, useRef, useEffect } from "react";
import { logout } from "@/lib/actions/auth";

type UserMenuProps = {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
};

export function UserMenu({ user }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user.email?.[0]?.toUpperCase() ?? "?";

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-primary"
        aria-label="User menu"
        aria-expanded={open}
      >
        {user.image ? (
          <img
            src={user.image}
            alt={user.name ?? "Avatar"}
            className="h-8 w-8 rounded-full object-cover"
          />
        ) : (
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
            {initials}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 rounded-lg border border-divider bg-content1 p-2 shadow-lg">
          <div className="border-b border-divider px-3 py-2">
            {user.name && (
              <p className="text-sm font-medium text-foreground">
                {user.name}
              </p>
            )}
            {user.email && (
              <p className="text-xs text-foreground/60">{user.email}</p>
            )}
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="mt-1 w-full rounded-md px-3 py-2 text-left text-sm text-danger transition-colors hover:bg-danger/10"
            >
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
