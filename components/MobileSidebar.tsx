"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { navItems } from "@/components/Sidebar";
import { LogoutButton } from "@/components/LogoutButton";

export function MobileSidebar() {
  const [open, setOpen] = useState(false);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {/* Hamburger button */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center justify-center rounded-md p-2 text-foreground/70 transition-colors hover:bg-content2 hover:text-foreground"
        aria-label="Open menu"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        >
          <path d="M3 5h14M3 10h14M3 15h14" />
        </svg>
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-[60] bg-black/50"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Slide-out panel */}
      <aside
        className={`fixed inset-y-0 left-0 z-[70] flex w-64 flex-col bg-background shadow-xl transition-transform duration-200 ease-in-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        role={open ? "dialog" : undefined}
        aria-modal={open ? true : undefined}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-divider px-4 py-4">
          <span className="text-base font-semibold text-foreground">
            DD Qualify
          </span>
          <button
            onClick={() => setOpen(false)}
            className="rounded-md p-1.5 text-foreground/60 transition-colors hover:bg-content2 hover:text-foreground"
            aria-label="Close menu"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            >
              <path d="M5 5l10 10M15 5L5 15" />
            </svg>
          </button>
        </div>

        {/* Nav */}
        <nav className="flex flex-1 flex-col gap-1 p-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="rounded-md px-3 py-2.5 text-sm font-medium text-foreground/80 transition-colors hover:bg-content2 hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-divider p-4">
          <LogoutButton />
        </div>
      </aside>
    </>
  );
}
