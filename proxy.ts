import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

// Routes that require authentication (the (app) route group)
const protectedPrefixes = ["/dashboard", "/settings", "/projects", "/project"];

// Routes only for unauthenticated users
const authRoutes = ["/login", "/register"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  // Logged-in users hitting auth pages → redirect to app
  if (authRoutes.some((route) => pathname.startsWith(route))) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
    }
    return NextResponse.next();
  }

  // Unauthenticated users hitting protected pages → redirect to login
  if (protectedPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    if (!isLoggedIn) {
      const loginUrl = new URL("/login", req.nextUrl);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // Everything else (marketing pages, etc.) is public
  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|\\.well-known/workflow/).*)"],
};
