"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { usePathname } from "next/navigation";
import { FiChevronLeft } from "react-icons/fi";
import { navItems } from "@/components/Sidebar";
import { LogoutButton } from "@/components/LogoutButton";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { getProjectForSidebar } from "@/lib/actions/sidebar";

type ProjectSubNavItem = {
  label: string;
  suffix: string;
};

function buildProjectSubNav(input: {
  hasInsights: boolean;
  hasReports: boolean;
}): ProjectSubNavItem[] {
  return [
    { label: "General", suffix: "" },
    ...(input.hasInsights ? [{ label: "Insights", suffix: "/insights" }] : []),
    ...(input.hasReports ? [{ label: "Reports", suffix: "/report" }] : []),
    { label: "Enquiries", suffix: "/enquiries" },
  ];
}

export function MobileSidebar() {
  const [open, setOpen] = useState(false);
  const [highlightSettings, setHighlightSettings] = useState(false);
  const pathname = usePathname();
  const projectMatch = pathname.match(/^\/project\/([^/]+)/);
  const projectId = projectMatch?.[1] ?? null;
  const [projectSidebarData, setProjectSidebarData] = useState<{
    id: string;
    name: string;
    hasInsights: boolean;
    hasReports: boolean;
  } | null>(null);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!projectId) {
      setProjectSidebarData(null);
      return;
    }

    let isMounted = true;
    getProjectForSidebar(projectId).then((project) => {
      if (!isMounted) return;
      setProjectSidebarData(project);
    });

    return () => {
      isMounted = false;
    };
  }, [projectId]);

  // Close on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    function handleHighlightSettings() {
      setHighlightSettings(true);
      window.setTimeout(() => setHighlightSettings(false), 2200);
    }

    window.addEventListener("ddq:highlight-settings-nav", handleHighlightSettings);
    return () => {
      window.removeEventListener("ddq:highlight-settings-nav", handleHighlightSettings);
    };
  }, []);

  const projectSubNav = buildProjectSubNav({
    hasInsights: projectSidebarData?.hasInsights ?? false,
    hasReports: projectSidebarData?.hasReports ?? false,
  });

  return (
    <>
      {/* Hamburger */}
      <motion.button
        onClick={() => setOpen(true)}
        animate={
          highlightSettings
            ? { x: [0, -4, 4, -2, 2, 0], scale: [1, 1.06, 1] }
            : { x: 0, scale: 1 }
        }
        transition={{ duration: 0.5, ease: "easeInOut" }}
        className="flex items-center justify-center rounded-md p-2 text-foreground/70 transition-colors hover:bg-content2 hover:text-foreground"
        aria-label="Open menu"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M3 5h14M3 10h14M3 15h14" />
        </svg>
      </motion.button>

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
        <div className="flex items-center justify-between border-b border-divider px-4 py-4">
          <span className="text-base font-semibold text-foreground">DD Qualify</span>
          <button
            onClick={() => setOpen(false)}
            className="rounded-md p-1.5 text-foreground/60 transition-colors hover:bg-content2 hover:text-foreground"
            aria-label="Close menu"
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M5 5l10 10M15 5L5 15" />
            </svg>
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 p-4">
          {projectId ? (
            <>
              <Link
                href="/dashboard"
                onClick={() => setOpen(false)}
                className="mb-3 flex items-center gap-1 text-xs font-medium text-foreground/40 transition-colors hover:text-foreground/70"
              >
                <FiChevronLeft className="h-3.5 w-3.5" />
                Projects
              </Link>

              <p
                className="mb-1 truncate px-3 text-xs font-semibold uppercase tracking-wider text-foreground/40"
                title={projectSidebarData?.name ?? undefined}
              >
                {projectSidebarData?.name ?? <span className="opacity-60">Loading…</span>}
              </p>

              {projectSubNav.map(({ label, suffix }) => {
                const href = `/project/${projectId}${suffix}`;
                const isActive =
                  suffix === ""
                    ? pathname === `/project/${projectId}`
                    : pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    className={`ml-2 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-content2 text-foreground"
                        : "text-foreground/70 hover:bg-content2 hover:text-foreground"
                    }`}
                  >
                    {label}
                  </Link>
                );
              })}

              <div className="my-2 border-t border-divider" />

              <motion.div
                animate={
                  highlightSettings
                    ? {
                        x: [0, -4, 4, -2, 2, 0],
                        scale: [1, 1.02, 1],
                      }
                    : { x: 0, scale: 1 }
                }
                transition={{ duration: 0.52, ease: "easeInOut" }}
                className={highlightSettings ? "rounded-md ring-2 ring-warning/45" : ""}
              >
                <Link
                  href="/settings"
                  onClick={() => setOpen(false)}
                  className={`rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                    pathname === "/settings"
                      ? "bg-content2 text-foreground"
                      : "text-foreground/70 hover:bg-content2 hover:text-foreground"
                  }`}
                >
                  Settings
                </Link>
              </motion.div>
            </>
          ) : (
            navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                  pathname === item.href
                    ? "bg-content2 text-foreground"
                    : "text-foreground/80 hover:bg-content2 hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            ))
          )}
        </nav>

        <div className="flex items-center justify-between border-t border-divider p-4">
          <LogoutButton />
          <ThemeSwitcher />
        </div>
      </aside>
    </>
  );
}
