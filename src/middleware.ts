import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

export async function middleware(request: NextRequest) {
  // Update session and get the response with updated cookies
  const { supabase, response } = await updateSession(request);

  // Check user session
  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // If user is not logged in and trying to access a protected route (e.g., /video/*)
  if (!user && pathname.startsWith('/video/')) {
    // Redirect to homepage or a specific login page
    const url = request.nextUrl.clone();
    url.pathname = '/'; 
    url.search = ''; // Clear any search params if redirecting
    return NextResponse.redirect(url);
  }

  // Allow the request to proceed for logged-in users or non-protected routes
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}