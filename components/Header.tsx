import Link from "next/link";
import { UserMenu } from "@/components/UserMenu";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";

type HeaderUser = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
} | null;

export function Header({
  user,
  variant = "light",
}: {
  user?: HeaderUser;
  variant?: "light" | "dark";
}) {
  const dark = variant === "dark";

  return (
    <header
      className={`flex items-center justify-between px-6 py-4 ${
        dark
          ? "border-b border-white/8 bg-[#0f0e0d]"
          : "border-b border-divider bg-background"
      }`}
    >
      <Link
        href="/"
        className={`text-lg font-semibold ${dark ? "text-white" : "text-foreground"}`}
      >
        DD Qualify
      </Link>
      <nav className="flex items-center gap-2">
        <Link
          href="/#workflow"
          className={`text-sm font-medium transition-colors ${
            dark
              ? "text-white/50 hover:text-white"
              : "text-foreground/70 hover:text-foreground"
          }`}
        >
          Workflow
        </Link>
        <Link
          href="/#coverage"
          className={`text-sm font-medium transition-colors px-2 ${
            dark
              ? "text-white/50 hover:text-white"
              : "text-foreground/70 hover:text-foreground"
          }`}
        >
          Coverage
        </Link>
        <Link
          href="/dashboard"
          className={`text-sm font-medium transition-colors px-2 ${
            dark
              ? "text-white/50 hover:text-white"
              : "text-foreground/70 hover:text-foreground"
          }`}
        >
          Dashboard
        </Link>

        <ThemeSwitcher
          className={
            dark
              ? "text-white/40 hover:text-white hover:bg-white/10"
              : "text-foreground/40 hover:text-foreground hover:bg-content2"
          }
        />

        {user ? (
          <UserMenu user={user} />
        ) : (
          <Link
            href="/login"
            className="ml-1 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Sign in
          </Link>
        )}
      </nav>
    </header>
  );
}
