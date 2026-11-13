/**
 * The admin panel keeps its Supabase session in its OWN cookie.
 *
 * Browsers ignore the port when scoping cookies, so on localhost the
 * storefront (:3000) and the admin (:3001) share one cookie jar. With the
 * default `sb-<ref>-auth-token` name, an admin sign-in would also sign the
 * owner in on the customer site (and a customer session would be read here).
 * A distinct name keeps the two sessions apart: the admin only ever reads
 * and writes `fb-admin-auth*`, so a storefront customer cookie is never even
 * looked at — and even if it were, admin access still requires
 * `app_metadata.role === 'admin'` on the verified user.
 *
 * Every @supabase/ssr client in this app must pass ADMIN_AUTH_COOKIE_OPTIONS
 * (it also becomes the auth `storageKey`). Plain module: proxy.ts imports it.
 */
export const ADMIN_AUTH_COOKIE_NAME = 'fb-admin-auth';

export const ADMIN_AUTH_COOKIE_OPTIONS = {
  name: ADMIN_AUTH_COOKIE_NAME,
  path: '/',
  sameSite: 'lax' as const,
};
