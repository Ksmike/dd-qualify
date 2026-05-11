import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { auth } from "@/lib/auth";

export default async function PublicDocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const user = session?.user
    ? {
        name: session.user.name ?? null,
        email: session.user.email ?? null,
        image: session.user.image ?? null,
      }
    : null;

  return (
    <>
      <Header user={user} />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
