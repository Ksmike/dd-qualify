import { Sidebar } from "@/components/Sidebar";
import { MobileSidebar } from "@/components/MobileSidebar";
import { Providers } from "@/components/providers/Providers";
import { auth } from "@/lib/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const user = session?.user
    ? {
        id: session.user.id!,
        locale: session.user.locale ?? "en",
        name: session.user.name ?? null,
        email: session.user.email ?? null,
        image: session.user.image ?? null,
      }
    : null;

  return (
    <Providers user={user}>
      <div className="flex flex-1 min-h-0 flex-col md:flex-row">
        {/* Mobile header with hamburger */}
        <header className="flex items-center gap-3 border-b border-divider bg-background px-4 py-3 md:hidden">
          <MobileSidebar />
          <span className="text-sm font-semibold text-foreground">
            DD Qualify
          </span>
        </header>

        {/* Desktop sidebar */}
        <Sidebar />

        <main className="flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden p-4 sm:p-6">
          {children}
        </main>
      </div>
    </Providers>
  );
}
