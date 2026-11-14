import 'server-only';
import { revalidateTag } from 'next/cache';
import { ADMIN_TAG } from './cached-queries';

/**
 * Drops every cached admin read (lib/cached-queries.ts) after a write, so
 * the next render (router.refresh()) shows the change. `expire: 0` makes
 * that render wait for fresh data instead of serving the stale copy.
 */
export function revalidateAdminData(): void {
  revalidateTag(ADMIN_TAG, { expire: 0 });
}
