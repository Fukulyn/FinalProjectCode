import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// Normalize Supabase recovery links that might land at root or elsewhere
export function middleware(req: NextRequest) {
  const url = new URL(req.url);
  const { pathname, searchParams, hash } = url;

  // If already on reset page, let it pass
  if (pathname.startsWith('/reset-password')) return NextResponse.next();

  // Detect recovery via query or hash fragments
  const code = searchParams.get('code');
  const type = searchParams.get('type');
  const hashStr = hash || '';
  const isRecoveryHash = hashStr.includes('type=recovery') || hashStr.includes('access_token=');
  const shouldReset = !!code || type === 'recovery' || isRecoveryHash;

  if (shouldReset) {
    const next = new URL('/reset-password', url.origin);
    if (code) next.searchParams.set('code', code);
    return NextResponse.redirect(next);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next|api|favicon.ico).*)'],
};
