import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { ADMIN_AUTH_COOKIE_OPTIONS } from './cookie';

/**
 * Per-request Supabase client bound to the visitor's auth cookies
 * (publishable key). Use it only to find out who is signed in and to sign
 * in/out. Store data is read and written by `supabase-db.ts` with the secret
 * key, after `requireAdmin()` has passed.
 */
export async function supabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be set.');
  }

  const cookieStore = await cookies();
  return createServerClient(url, key, {
    // Admin-only cookie name (see ./cookie.ts).
    cookieOptions: ADMIN_AUTH_COOKIE_OPTIONS,
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component: cookies are read-only there.
          // proxy.ts refreshes the session, so this is safe to ignore.
        }
      },
    },
  });
}
