import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { NextResponse, connection } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { supabaseServer } from '@/lib/supabase/server';
import { isAdminAppMetadata } from '@/lib/admin-role';

export { ADMIN_ROLE, isAdminAppMetadata } from '@/lib/admin-role';

export interface AdminUser {
  id: string;
  email: string;
  /** user_metadata.full_name, set on the Profile page. */
  name: string | null;
  /** user_metadata.avatar_url, uploaded on the Profile page. */
  avatarUrl: string | null;
  lastSignInAt: string | null;
  createdAt: string | null;
}

type AdminCheck =
  | { ok: true; admin: AdminUser }
  | { ok: false; status: 401 | 403 };

/**
 * Checks the current request's session against the Auth server.
 *
 * Uses `getUser()` rather than `getClaims()`: it asks Supabase Auth for the
 * user record, so a revoked role or a signed-out session takes effect at
 * once instead of when the access token expires.
 */
export async function checkAdmin(): Promise<AdminCheck> {
  // Request-time only. Supabase's getUser() reads Date.now() (token expiry),
  // which Cache Components rejects while prerendering; this keeps the auth
  // check out of every prerender. Outside the try so its abort isn't swallowed.
  await connection();
  let user: User | null = null;
  try {
    const supabase = await supabaseServer();
    const { data, error } = await supabase.auth.getUser();
    user = error ? null : data.user;
  } catch {
    user = null;
  }

  if (!user) return { ok: false, status: 401 };
  if (!isAdminAppMetadata(user.app_metadata)) return { ok: false, status: 403 };
  const fullName = typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name.trim() : '';
  return {
    ok: true,
    admin: {
      id: user.id,
      email: user.email ?? '',
      name: fullName || null,
      avatarUrl: typeof user.user_metadata?.avatar_url === 'string' ? user.user_metadata.avatar_url : null,
      lastSignInAt: user.last_sign_in_at ?? null,
      createdAt: user.created_at ?? null,
    },
  };
}

const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' };

export function authErrorResponse(status: 401 | 403) {
  return status === 401
    ? NextResponse.json(
        { error: 'UNAUTHENTICATED', message: 'Please sign in to the admin panel.' },
        { status: 401, headers: NO_STORE }
      )
    : NextResponse.json(
        { error: 'FORBIDDEN', message: 'This account does not have admin access.' },
        { status: 403, headers: NO_STORE }
      );
}

/**
 * Guard for Route Handlers. Usage:
 *
 *   const auth = await requireAdmin();
 *   if (!auth.ok) return auth.response;
 */
export async function requireAdmin(): Promise<
  { ok: true; admin: AdminUser } | { ok: false; response: NextResponse }
> {
  const result = await checkAdmin();
  if (result.ok) return result;
  return { ok: false, response: authErrorResponse(result.status) };
}

/**
 * Fast check for rendering pages: verifies the session JWT locally with
 * getClaims() (ES256, the project's published signing key is cached), so
 * no Auth round trip per navigation. The role comes from the signed token's
 * app_metadata, which only the secret key can write.
 *
 * Trade-off, by design: a revoked admin can still *view* pages until their
 * access token expires (1 hour by default). Every write (route handlers and
 * server actions) still uses checkAdmin(), which asks the Auth server.
 */
async function checkAdminFromToken(): Promise<AdminCheck> {
  await connection();
  try {
    const supabase = await supabaseServer();
    const { data, error } = await supabase.auth.getClaims();
    const claims = data?.claims;
    if (error || !claims?.sub) return { ok: false, status: 401 };
    if (!isAdminAppMetadata(claims.app_metadata)) return { ok: false, status: 403 };
    const meta = (claims.user_metadata ?? {}) as Record<string, unknown>;
    const fullName = typeof meta.full_name === 'string' ? meta.full_name.trim() : '';
    return {
      ok: true,
      admin: {
        id: claims.sub,
        email: typeof claims.email === 'string' ? claims.email : '',
        name: fullName || null,
        avatarUrl: typeof meta.avatar_url === 'string' ? meta.avatar_url : null,
        // Not in the token; pages that need them use checkAdmin().
        lastSignInAt: null,
        createdAt: null,
      },
    };
  } catch {
    return { ok: false, status: 401 };
  }
}

/**
 * Guard for Server Components and pages: redirects to /login unless the
 * session token belongs to an admin (checkAdminFromToken). Deduplicated per
 * request with React cache(). Reads cookies, so render inside <Suspense>.
 */
export const requireAdminPage = cache(async (): Promise<AdminUser> => {
  const result = await checkAdminFromToken();
  if (!result.ok) redirect('/login');
  return result.admin;
});

/** Like requireAdminPage, but confirmed with the Auth server (full user record). */
export const requireAdminAccount = cache(async (): Promise<AdminUser> => {
  const result = await checkAdmin();
  if (!result.ok) redirect('/login');
  return result.admin;
});

/**
 * requireAdminPage() and a data load in parallel (the Auth round trip no
 * longer delays the query). The data is only returned once the admin check
 * has passed; a failed check redirects to /login as before. Use it only for
 * secret-key reads that don't depend on who the admin is.
 */
export async function requireAdminWith<T>(load: () => Promise<T>): Promise<[AdminUser, T]> {
  return Promise.all([requireAdminPage(), load()]);
}
