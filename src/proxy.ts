// src/proxy.ts
import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";

export async function proxy(req: NextRequest) {
  const session = await auth();
  const isLoggedIn = !!session;
  const isSigninRoute = req.nextUrl.pathname === "/signin";
  const isSignupRoute = req.nextUrl.pathname === "/signup";
  const isDashboardRoute = req.nextUrl.pathname === "/";

  if (isDashboardRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL("/signin", req.nextUrl));
  }

  if ((isSigninRoute || isSignupRoute) && isLoggedIn) {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  // Apply middleware to all routes except static assets and API routes
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
