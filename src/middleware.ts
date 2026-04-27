import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE_NAME } from "@/lib/admin/constants";

/**
 * Edge middleware — cheap presence-of-cookie gate for /admin/*.
 *
 * We only check that a session cookie exists here, not that it's valid —
 * full HMAC verification happens in the admin layout which runs Node.js.
 * This middleware exists so unauthenticated requests redirect to /login
 * before any admin page renders, avoiding flashes of protected UI.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Public admin paths — let the login page render normally.
  if (
    pathname === "/admin/login" ||
    pathname.startsWith("/api/admin/login") ||
    pathname.startsWith("/api/admin/logout")
  ) {
    return NextResponse.next();
  }

  const hasCookie = Boolean(req.cookies.get(SESSION_COOKIE_NAME)?.value);
  if (!hasCookie) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
