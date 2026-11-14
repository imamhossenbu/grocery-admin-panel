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
  return { ok: true, admin: { id: user.id, email: user.email ?? '' } };
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
 * Guard for Server Components and pages: redirects to /login unless the
 * request comes from an admin. Deduplicated per request with React cache(),
 * so several Suspense sections on one page cost one Auth round trip.
 * Reads cookies, so it must run inside a <Suspense> boundary.
 */
export const requireAdminPage = cache(async (): Promise<AdminUser> => {
  const result = await checkAdmin();
  if (!result.ok) redirect('/login');
  return result.admin;
});
