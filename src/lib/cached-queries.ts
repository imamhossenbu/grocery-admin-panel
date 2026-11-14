import 'server-only';
import { cacheLife, cacheTag } from 'next/cache';
import * as q from './admin-queries';
import type { CustomerFilters } from '@/types/admin';
import { ORDER_STATUSES } from '@/types/store';

/**
 * Cached reads for the admin pages (stale-while-revalidate).
 *
 * Every function here runs the matching admin-queries.ts read under
 * `'use cache'` with the "admin" profile (next.config.ts): a result is
 * served from the server cache for a few seconds, then refreshed in the
 * background while the old one is still served. Admin writes call
 * revalidateAdminData() (lib/revalidate-admin.ts), so a change made in the
 * panel shows up on the very next render.
 *
 * Only data read with the secret key belongs here: nothing below may read
 * cookies or depend on who is signed in. Pages still run requireAdminPage()
 * before showing any of it.
 *
 * Orders placed on the storefront are not tagged from there; they appear
 * once the short revalidate window passes (the notification bell polls
 * getPulse() uncached, so new-order alerts stay live).
 */

export const ADMIN_TAG = 'admin';

function admin(...tags: string[]) {
  cacheLife('admin');
  cacheTag(ADMIN_TAG, ...tags);
}

type Arg<F extends (...a: never[]) => unknown> = Parameters<F>[0];

export async function getOverview(input: Arg<typeof q.getOverview>) {
  'use cache';
  admin('overview');
  return q.getOverview(input);
}

export async function listOrders(f: Arg<typeof q.listOrders>) {
  'use cache';
  admin('orders');
  return q.listOrders(f);
}

export async function getOrder(id: string) {
  'use cache';
  admin('orders');
  return q.getOrder(id);
}

/** Shared by every customer tab, search and page: switching is in-memory. */
async function customerRows() {
  'use cache';
  admin('customers');
  return q.loadCustomerRows();
}

export async function listCustomers(f: CustomerFilters) {
  return q.filterCustomers(await customerRows(), f);
}

export async function getCustomer(id: string) {
  'use cache';
  admin('customers');
  return q.getCustomer(id);
}

export async function listProducts(f: Arg<typeof q.listProducts>) {
  'use cache';
  admin('products');
  return q.listProducts(f);
}

export async function getProduct(id: string) {
  'use cache';
  admin('products');
  return q.getProduct(id);
}

export async function getCategoriesData() {
  'use cache';
  admin('categories');
  return q.getCategoriesData();
}

export async function listCoupons() {
  'use cache';
  admin('coupons');
  return q.listCoupons();
}

export async function listReviews(f: Arg<typeof q.listReviews>) {
  'use cache';
  admin('reviews');
  return q.listReviews(f);
}

export async function listMessages(f: Arg<typeof q.listMessages>) {
  'use cache';
  admin('messages');
  return q.listMessages(f);
}

export async function getMessage(id: string) {
  'use cache';
  admin('messages');
  return q.getMessage(id);
}

export async function listSubscribers(f: Arg<typeof q.listSubscribers>) {
  'use cache';
  admin('newsletter');
  return q.listSubscribers(f);
}

export async function listAdmins() {
  'use cache';
  admin('admins');
  return q.listAdmins();
}

export async function getDeliverySettings() {
  'use cache';
  admin('settings');
  return q.getDeliverySettings();
}

export async function getStoreStats() {
  'use cache';
  admin('stats');
  return q.getStoreStats();
}

// ---------------------------------------------------------------------------
// Background warm-up of the other tabs
//
// Called with after() once a list page has been sent: it loads the sibling
// tabs (same search, sort and page size; first page) into the cache, so
// switching tabs is served from cache instead of waiting for the database.
// The filter objects must match what the page parses for that tab's URL,
// so tab switches reset `page` to 1 exactly like useUrlState().set() does.
// ---------------------------------------------------------------------------

const quietly = (work: Promise<unknown>[]) => Promise.allSettled(work).then(() => undefined);

export function warmOrderTabs(f: Arg<typeof q.listOrders>) {
  const statuses = (['all', ...ORDER_STATUSES] as const).filter((s) => s !== f.status);
  return quietly(statuses.map((status) => listOrders({ ...f, status, page: 1 })));
}

export function warmProductTabs(f: Arg<typeof q.listProducts>) {
  const views = [
    { status: 'all', stock: 'all' },
    { status: 'active', stock: 'all' },
    { status: 'hidden', stock: 'all' },
    { status: 'all', stock: 'low' },
    { status: 'all', stock: 'out' },
  ] as const;
  return quietly(
    views
      .filter((v) => !(v.status === f.status && v.stock === f.stock))
      .map((v) => listProducts({ ...f, ...v, page: 1 }))
  );
}

export function warmReviewTabs(f: Arg<typeof q.listReviews>) {
  const statuses = (['all', 'approved', 'hidden'] as const).filter((s) => s !== f.status);
  return quietly(statuses.map((status) => listReviews({ ...f, status, page: 1 })));
}
