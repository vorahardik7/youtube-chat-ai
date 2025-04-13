// src/app/auth/callback/route.ts
import { NextResponse } from 'next/server';
// The client you created from the Server-Side Auth instructions
import { createClient } from '@/app/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/';
  
  if (code) {
    const supabase = await createClient(); // Use the server client
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const forwardedHost = request.headers.get('x-forwarded-host'); // original origin before load balancer
      const isLocalEnv = process.env.NODE_ENV === 'development';
      
      if (isLocalEnv) {
        // we can be sure that there is no load balancer in between, so no need to watch for X-Forwarded-Host
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        // Make sure to use https for production environments
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        // Fallback to origin if forwardedHost is not available
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
    console.error('Error exchanging code for session:', error);
  }
  
  // return the user to an error page with instructions
  console.error('No code found in callback URL or error occurred.');
  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
