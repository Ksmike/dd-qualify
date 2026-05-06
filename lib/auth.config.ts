import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";

// This config is used by middleware (Edge Runtime) — no Prisma imports here.
// The authorize logic is in lib/auth.ts which runs in Node.js runtime.
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  providers: [
    // Credentials needs to be listed here for middleware to recognize it,
    // but the actual authorize function is in lib/auth.ts
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      // This won't be called from middleware — it's a placeholder
      authorize: () => null,
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.locale = user.locale ?? "en";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.locale = (token.locale as string | undefined) ?? "en";
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
