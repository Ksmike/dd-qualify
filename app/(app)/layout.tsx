import { Sidebar } from "@/components/Sidebar";
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
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </Providers>
  );
}
