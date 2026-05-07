import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { RootProviders } from "@/components/providers/RootProviders";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DD Qualify | Source-of-Truth Intelligence for Investment Diligence",
  description:
    "DD Qualify is the source-of-truth intelligence layer for VC and PE diligence teams. Every claim from every source — triangulated automatically, with gaps closed and contradictions surfaced.",
};

// Runs synchronously before React hydrates — prevents flash of wrong theme.
const themeScript = `
  try {
    const t = localStorage.getItem("dd:theme");
    const root = document.documentElement;
    if (t === "dark") { root.classList.add("dark"); root.classList.remove("light"); }
    else { root.classList.add("light"); root.classList.remove("dark"); }
  } catch {}
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} h-full antialiased overflow-x-hidden`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col overflow-x-hidden w-full">
        <RootProviders>{children}</RootProviders>
      </body>
    </html>
  );
}
