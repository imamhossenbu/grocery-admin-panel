import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { isAdminAppMetadata } from '@/lib/admin-role';
import { safeNext } from '@/lib/safe-next';
import { ADMIN_AUTH_COOKIE_OPTIONS } from '@/lib/supabase/cookie';

const NO_STORE = 'no-store, max-age=0';

/**
 * Runs before every request except static assets:
 *  1. Refreshes the Supabase session cookies (the standard @supabase/ssr
 *     pattern) so Server Components and Route Handlers see a valid token.
 *  2. Keeps everyone who is not an admin out of the panel:
 *     - pages redirect to /login?next=<where they were going>
 *     - /api/* answers JSON 401 (no session) or 403 (signed in, not admin)
 *     - /login itself stays open; a signed-in admin is sent on to `next`.
 *
 * This is the first gate, not the only one: /api/store and /api/upload call
 * requireAdmin() themselves, and server actions re-check the user.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isApi = pathname === '/api' || pathname.startsWith('/api/');
  const isLogin = pathname === '/login';

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    // Fail closed: without Supabase settings nobody can be verified.
    if (isLogin) return NextResponse.next({ request });
    return NextResponse.json(
      { error: 'AUTH_NOT_CONFIGURED', message: 'Supabase Auth is not configured on the server.' },
      { status: 503, headers: { 'Cache-Control': NO_STORE } }
    );
  }

  let response = NextResponse.next({ request });
  const cacheHeaders: Record<string, string> = {};

  const supabase = createServerClient(url, key, {
    // Admin-only cookie name: never reads the storefront's customer session.
    cookieOptions: ADMIN_AUTH_COOKIE_OPTIONS,
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet, headers) => {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.assign(cacheHeaders, headers);
        Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });

  // Must run before any response is produced: it triggers the token refresh.
  // getClaims() verifies the JWT signature (locally against the project's
  // JWKS, or via the Auth server for symmetric keys) — never getSession().
  // The role comes from the verified `app_metadata` claim, which only the
  // secret key can set.
  let signedIn = false;
  let isAdmin = false;
  try {
    const { data, error } = await supabase.auth.getClaims();
    const claims = error ? null : data?.claims;
    signedIn = typeof claims?.sub === 'string';
    isAdmin = signedIn && isAdminAppMetadata(claims?.app_metadata);
  } catch {
    signedIn = false;
    isAdmin = false;
  }

  // Every response we build must carry any refreshed (or cleared) cookies.
  const withSessionCookies = <T extends NextResponse>(res: T): T => {
    response.cookies.getAll().forEach((c) => res.cookies.set(c));
    Object.entries(cacheHeaders).forEach(([k, v]) => res.headers.set(k, v));
    return res;
  };

  if (isLogin) {
    if (isAdmin && request.method === 'GET') {
      const dest = new URL(safeNext(request.nextUrl.searchParams.get('next')), request.url);
      return withSessionCookies(NextResponse.redirect(dest));
    }
    return response;
  }

  if (isAdmin) return response;

  if (isApi) {
    const body = signedIn
      ? { error: 'FORBIDDEN', message: 'This account does not have admin access.' }
      : { error: 'UNAUTHENTICATED', message: 'Please sign in to the admin panel.' };
    return withSessionCookies(
      NextResponse.json(body, { status: signedIn ? 403 : 401, headers: { 'Cache-Control': NO_STORE } })
    );
  }

  const login = request.nextUrl.clone();
  login.pathname = '/login';
  login.search = '';
  const next = safeNext(`${pathname}${search}`, '');
  if (next && next !== '/') login.searchParams.set('next', next);
  // 303 so a blocked POST (e.g. a server action) is retried as a GET.
  return withSessionCookies(
    NextResponse.redirect(login, request.method === 'GET' || request.method === 'HEAD' ? 307 : 303)
  );
}

export const config = {
  matcher: [
    // Everything except Next internals, the favicon and static image/font files.
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff2?|ttf|txt|xml|webmanifest)$).*)',
  ],
};
