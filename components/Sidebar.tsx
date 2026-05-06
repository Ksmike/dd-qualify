"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { FiChevronLeft } from "react-icons/fi";
import { LogoutButton } from "@/components/LogoutButton";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { getProjectForSidebar } from "@/lib/actions/sidebar";

export const navItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Settings", href: "/settings" },
];

const projectSubNav = [
  { label: "General", suffix: "" },
  { label: "Insights", suffix: "/insights" },
  { label: "Tasks", suffix: "/tasks" },
  { label: "Report", suffix: "/report" },
];

export function Sidebar() {
  const pathname = usePathname();
  const projectMatch = pathname.match(/^\/project\/([^/]+)/);
  const projectId = projectMatch?.[1] ?? null;
  const [projectName, setProjectName] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) {
      setProjectName(null);
      return;
    }
    getProjectForSidebar(projectId).then((p) => setProjectName(p?.name ?? null));
  }, [projectId]);

  return (
    <aside className="hidden md:flex w-64 flex-col border-r border-divider bg-content1 p-4">
      <nav className="flex flex-1 flex-col">
        {projectId ? (
          <ProjectNav
            projectId={projectId}
            projectName={projectName}
            pathname={pathname}
          />
        ) : (
          <DefaultNav pathname={pathname} />
        )}
      </nav>
      <div className="flex items-center justify-between border-t border-divider pt-3">
        <LogoutButton />
        <ThemeSwitcher />
      </div>
    </aside>
  );
}

function DefaultNav({ pathname }: { pathname: string }) {
  return (
    <div className="flex flex-col gap-1">
      {navItems.map((item) => (
        <NavLink
          key={item.href}
          href={item.href}
          label={item.label}
          isActive={pathname === item.href}
        />
      ))}
    </div>
  );
}

function ProjectNav({
  projectId,
  projectName,
  pathname,
}: {
  projectId: string;
  projectName: string | null;
  pathname: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      {/* Back to projects */}
      <Link
        href="/dashboard"
        className="mb-3 flex items-center gap-1 text-xs font-medium text-foreground/40 transition-colors hover:text-foreground/70"
      >
        <FiChevronLeft className="h-3.5 w-3.5" />
        Projects
      </Link>

      {/* Project name label */}
      <p
        className="mb-1 truncate px-3 text-xs font-semibold uppercase tracking-wider text-foreground/40"
        title={projectName ?? undefined}
      >
        {projectName ?? <span className="opacity-60">Loading…</span>}
      </p>

      {/* Sub-nav items */}
      {projectSubNav.map(({ label, suffix }) => {
        const href = `/project/${projectId}${suffix}`;
        const isActive =
          suffix === ""
            ? pathname === `/project/${projectId}`
            : pathname.startsWith(href);
        return (
          <NavLink key={href} href={href} label={label} isActive={isActive} indent />
        );
      })}

      <div className="my-3 border-t border-divider" />

      <NavLink
        href="/settings"
        label="Settings"
        isActive={pathname === "/settings"}
      />
    </div>
  );
}

function NavLink({
  href,
  label,
  isActive,
  indent,
}: {
  href: string;
  label: string;
  isActive: boolean;
  indent?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${indent ? "ml-2" : ""} ${
        isActive
          ? "bg-content2 text-foreground"
          : "text-foreground/70 hover:bg-content2 hover:text-foreground"
      }`}
    >
      {label}
    </Link>
  );
}
