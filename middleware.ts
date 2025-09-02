import { NextResponse, type NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  
  // Get the pathname for easier access
  const pathname = req.nextUrl.pathname;
  
  // Skip middleware for static files and API routes
  if (pathname.startsWith('/_next') || pathname.startsWith('/api')) {
    return res;
  }

  // Check for Supabase authentication cookies
  // Supabase stores auth tokens in cookies with these patterns
  const allCookies = req.cookies.getAll();
  
  // Look for any cookie that contains 'sb-' (Supabase) and has a value
  const hasAuthCookie = allCookies.some(cookie => 
    cookie.name.startsWith('sb-') && 
    cookie.value && 
    cookie.value.length > 0 &&
    cookie.value !== 'null' &&
    cookie.value !== 'undefined'
  );
  
  const isAuthed = hasAuthCookie;
  
  // Define route types
  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/register");
  const needsAuth = pathname.startsWith("/polls");

  // If user is on auth page but already authenticated, redirect to polls
  if (isAuthPage && isAuthed) {
    const url = req.nextUrl.clone();
    url.pathname = "/polls";
    return NextResponse.redirect(url);
  }

  // If user needs auth but isn't authenticated, redirect to login
  if (needsAuth && !isAuthed) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api (API routes)
     */
    "/((?!_next/static|_next/image|favicon.ico|api).*)",
  ],
};


