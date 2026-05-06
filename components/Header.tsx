import Link from "next/link";
import { UserMenu } from "@/components/UserMenu";

type HeaderUser = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
} | null;

export function Header({ user }: { user?: HeaderUser }) {
  return (
    <header className="flex items-center justify-between border-b border-divider bg-background px-6 py-4">
      <Link href="/" className="text-lg font-semibold text-foreground">
        DD Qualify
      </Link>
      <nav className="flex items-center gap-4">
        <Link
          href="/#workflow"
          className="text-sm font-medium text-foreground/70 transition-colors hover:text-foreground"
        >
          Workflow
        </Link>
        <Link
          href="/#coverage"
          className="text-sm font-medium text-foreground/70 transition-colors hover:text-foreground"
        >
          Coverage
        </Link>
        <Link
          href="/dashboard"
          className="text-sm font-medium text-foreground/70 transition-colors hover:text-foreground"
        >
          Dashboard
        </Link>
        {user ? (
          <UserMenu user={user} />
        ) : (
          <Link
            href="/login"
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Sign in
          </Link>
        )}
      </nav>
    </header>
  );
}
