import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Middleware to protect dashboard routes.
 * Redirects unauthenticated users to /login.
 * 
 * Note: This is a client-side auth check using cookies.
 * For production, consider server-side session validation.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Only protect dashboard routes
  if (pathname.startsWith("/dashboard") || pathname === "/" || pathname.match(/^\/events/)) {
    // Check for session cookie (Better Auth uses 'better-auth.session_token')
    const sessionToken = request.cookies.get("better-auth.session_token");
    
    if (!sessionToken) {
      // No session - redirect to login
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - /login (auth page)
     * - /api (API routes)
     * - /_next/static (static files)
     * - /_next/image (image optimization)
     * - /favicon.ico (favicon)
     * - public folder
     */
    "/((?!login|api|_next/static|_next/image|favicon.ico|public).*)",
  ],
};
