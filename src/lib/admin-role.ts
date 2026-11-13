/**
 * Who counts as an admin.
 *
 * The storefront's customers sign in to the SAME Supabase project, so being
 * signed in is not enough. An admin is a user whose `app_metadata.role` is
 * "admin". `app_metadata` can only be written with the secret key (see
 * `scripts/create-admin.mjs`), so a customer cannot grant it to themselves.
 * `user_metadata` is user-editable and must never be used for this.
 *
 * Plain module (no `server-only`, no `next/headers`) so proxy.ts can use it.
 */
export const ADMIN_ROLE = 'admin';

export function isAdminAppMetadata(appMetadata: unknown): boolean {
  return (
    typeof appMetadata === 'object' &&
    appMetadata !== null &&
    (appMetadata as Record<string, unknown>).role === ADMIN_ROLE
  );
}
