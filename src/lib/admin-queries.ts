import 'server-only';

import type { User } from '@supabase/supabase-js';
import {
  ORDER_STATUSES,
  type Category,
  type Coupon,
  type Order,
  type OrderStatus,
  type PaymentMethod,
  type Product,
} from '@/types/store';
import type {
  ActivityItem,
  AdminAccountRow,
  ContactMessage,
  CustomerDetail,
  CustomerFilters,
  CustomerRow,
  DeliverySettings,
  DeliverySettingsState,
  OrderFilters,
  OrdersPage,
  OverviewData,
  Paged,
  ProductFilters,
  ProductsPage,
  Pulse,
  ReviewFilters,
  ReviewRow,
  ReviewsPage,
  SearchResults,
  SeriesPoint,
  Subscriber,
} from '@/types/admin';
import {
  CATEGORY_COLUMNS,
  COUPON_COLUMNS,
  ORDER_ADDRESS_COLUMNS,
  ORDER_COLUMNS,
  PRODUCT_COLUMNS,
  StoreError,
  categoryFromRow,
  couponFromRow,
  getDb,
  orderFromRow,
  productFromRow,
  toStoreError,
  type CategoryRow,
  type CouponRow,
  type OrderRow,
  type ProductRow,
} from './supabase-db';
import { countByCategory, getRootId, getSubtreeIds } from './category-tree';
import { LOW_STOCK_THRESHOLD } from './constants';
import { addDays, dayKeyOf, dayStart, formatDayKey, hourOf, resolveRange } from './dates';
import { cleanSearch } from './filters';
import { isAdminAppMetadata } from './admin-role';
import { formatAddress } from './address';

// ---------------------------------------------------------------------------
// Read-only queries behind the admin pages. Server only, secret key. Every
// caller (page or route handler) must have passed requireAdmin()/
// requireAdminPage() first. Order rows are always selected with explicit
// columns, so `orders.access_token` never leaves the database.
// ---------------------------------------------------------------------------

// supabase-js builders are deeply generic; filters are applied through this
// loose alias so one helper can serve several query shapes.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Builder = any;

const BATCH = 1000;

// ---- Optional columns (added by a later storefront migration) -------------
// Probed once; a "missing" answer is re-checked after a minute so the panel
// picks the columns up without a restart once the migration has run.

const probes = new Map<string, { ok: boolean; at: number }>();

async function hasColumns(table: string, columns: string): Promise<boolean> {
  const key = `${table}:${columns}`;
  const hit = probes.get(key);
  if (hit && (hit.ok || Date.now() - hit.at < 60_000)) return hit.ok;
  const { error } = await getDb().from(table).select(columns).limit(1);
  const ok = !error;
  probes.set(key, { ok, at: Date.now() });
  return ok;
}

/** Order columns including the structured address when available. Never access_token. */
async function orderCols(): Promise<string> {
  return (await hasColumns('orders', ORDER_ADDRESS_COLUMNS)) ? `${ORDER_COLUMNS}, ${ORDER_ADDRESS_COLUMNS}` : ORDER_COLUMNS;
}

const PROFILE_BASE = 'id, full_name, phone, address, area, city, updated_at';
const PROFILE_EXTRA = 'division, district, upazila, union_name, landmark, postcode';

async function profileCols(): Promise<string> {
  return (await hasColumns('profiles', PROFILE_EXTRA)) ? `${PROFILE_BASE}, ${PROFILE_EXTRA}` : PROFILE_BASE;
}

/** Reads every row of a query in pages of 1000 (PostgREST's max-rows cap). */
async function fetchAll<T>(make: () => Builder, cap = 50_000): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; from < cap; from += BATCH) {
    const { data, error } = await make().range(from, from + BATCH - 1);
    if (error) throw toStoreError(error);
    const rows = (data ?? []) as T[];
    out.push(...rows);
    if (rows.length < BATCH) break;
  }
  return out;
}

function check<T>(result: { data: T | null; error: unknown; count?: number | null }): T {
  if (result.error) throw toStoreError(result.error as Parameters<typeof toStoreError>[0]);
  return result.data as T;
}

/** "Table/function not there yet" codes from PostgREST / Postgres. */
const NOT_READY = new Set(['PGRST205', 'PGRST202', '42P01', '42883']);

const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** `col.ilike."*term*"` for each column, OR-ed. `term` must already be cleaned. */
function ilikeAny(columns: string[], term: string): string {
  return columns.map((c) => `${c}.ilike."*${term}*"`).join(',');
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

function applyOrderFilters(
  q: Builder,
  f: OrderFilters,
  opts: { skipStatus?: boolean; withDistrict?: boolean } = {}
): Builder {
  if (f.district && opts.withDistrict) q = q.eq('customer_district', f.district);
  if (!opts.skipStatus && f.status !== 'all') q = q.eq('status', f.status);
  if (f.method !== 'all') q = q.eq('payment_method', f.method);
  if (f.pay.length) q = q.in('payment_status', f.pay);
  if (f.refund) {
    q = q.eq('payment_method', 'sslcommerz').eq('payment_status', 'paid').eq('status', 'Cancelled');
  }
  if (f.from) q = q.gte('created_at', dayStart(f.from).toISOString());
  if (f.to) q = q.lt('created_at', dayStart(addDays(f.to, 1)).toISOString());
  if (f.area) q = q.eq('customer_area', f.area);
  if (f.q) {
    q = q.or(ilikeAny(['id', 'customer_name', 'customer_phone', 'customer_email', 'payment_tran_id'], f.q));
  }
  return q;
}

export async function listOrders(f: OrderFilters): Promise<OrdersPage> {
  const db = getDb();
  const start = (f.page - 1) * f.pageSize;
  const cols = await orderCols();
  const withDistrict = cols !== ORDER_COLUMNS;

  const [pageResult, statusRows, areaRows, districtRows] = await Promise.all([
    applyOrderFilters(db.from('orders').select(cols, { count: 'exact' }), f, { withDistrict })
      .order(f.sort, { ascending: f.dir === 'asc' })
      .order('id', { ascending: true })
      .range(start, start + f.pageSize - 1),
    fetchAll<{ status: OrderStatus; payment_method: string; payment_status: string }>(() =>
      applyOrderFilters(db.from('orders').select('status, payment_method, payment_status'), f, {
        skipStatus: true,
        withDistrict,
      })
    ),
    fetchAll<{ customer_area: string }>(() => db.from('orders').select('customer_area'), 10_000),
    withDistrict
      ? fetchAll<{ customer_district: string | null }>(
          () => db.from('orders').select('customer_district').not('customer_district', 'is', null),
          10_000
        )
      : Promise.resolve([] as { customer_district: string | null }[]),
  ]);

  // Asking for a page past the end (e.g. after filters shrink the list) is not an error.
  if (pageResult.error && pageResult.error.code !== 'PGRST103') throw toStoreError(pageResult.error);

  const statusCounts = Object.fromEntries([['all', 0], ...ORDER_STATUSES.map((s) => [s, 0])]) as Record<
    OrderStatus | 'all',
    number
  >;
  let refundCount = 0;
  for (const r of statusRows) {
    statusCounts.all += 1;
    if (r.status in statusCounts) statusCounts[r.status] += 1;
    if (r.payment_method === 'sslcommerz' && r.payment_status === 'paid' && r.status === 'Cancelled') {
      refundCount += 1;
    }
  }

  const areas = [...new Set(areaRows.map((r) => (r.customer_area ?? '').trim()).filter(Boolean))].sort(
    (a, b) => a.localeCompare(b)
  );

  const districts = [...new Set(districtRows.map((r) => (r.customer_district ?? '').trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b)
  );

  return {
    rows: ((pageResult.data ?? []) as unknown as OrderRow[]).map(orderFromRow),
    total: pageResult.count ?? 0,
    page: f.page,
    pageSize: f.pageSize,
    statusCounts,
    areas,
    districts,
    refundCount,
  };
}

/** Every order matching the filters (for CSV export), newest first. */
export async function exportOrders(f: OrderFilters): Promise<Order[]> {
  const db = getDb();
  const cols = await orderCols();
  const rows = await fetchAll<OrderRow>(
    () =>
      applyOrderFilters(db.from('orders').select(cols), f, { withDistrict: cols !== ORDER_COLUMNS })
        .order(f.sort, { ascending: f.dir === 'asc' })
        .order('id', { ascending: true }),
    20_000
  );
  return rows.map(orderFromRow);
}

export async function getOrder(
  id: string
): Promise<{ order: Order; customerOrders: number; customerName: string | null } | null> {
  const db = getDb();
  const row = check(
    await db.from('orders').select(await orderCols()).eq('id', id).maybeSingle()
  ) as unknown as OrderRow | null;
  if (!row) return null;
  const order = orderFromRow(row);

  const countQuery = order.userId
    ? db.from('orders').select('id', { count: 'exact', head: true }).eq('user_id', order.userId)
    : db.from('orders').select('id', { count: 'exact', head: true }).eq('customer_phone', order.customer.phone);
  const [countResult, profile] = await Promise.all([
    countQuery,
    order.userId
      ? db.from('profiles').select('full_name').eq('id', order.userId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  if (countResult.error) throw toStoreError(countResult.error);

  return {
    order,
    customerOrders: countResult.count ?? 1,
    customerName: (profile.data as { full_name?: string } | null)?.full_name || null,
  };
}

// ---------------------------------------------------------------------------
// Overview analytics
// ---------------------------------------------------------------------------

interface LightOrder {
  id: string;
  created_at: string;
  total: number | string;
  status: OrderStatus;
  payment_method: PaymentMethod;
  customer_phone: string;
  items?: unknown;
}

function summarize(orders: LightOrder[]) {
  const live = orders.filter((o) => o.status !== 'Cancelled');
  const revenue = live.reduce((s, o) => s + num(o.total), 0);
  const online = live.filter((o) => o.payment_method === 'sslcommerz').length;
  return {
    revenue,
    orders: orders.length,
    liveOrders: live.length,
    aov: live.length ? revenue / live.length : 0,
    onlineShare: live.length ? online / live.length : 0,
  };
}

export async function getOverview(input: { range?: string; from?: string; to?: string }): Promise<OverviewData> {
  const db = getDb();
  const r = resolveRange(input);
  const LIGHT = 'id, created_at, total, status, payment_method, customer_phone';

  const [current, previous, firstOrders, products, categories, lowStock, recent, activity] =
    await Promise.all([
      fetchAll<LightOrder>(() =>
        db
          .from('orders')
          .select(`${LIGHT}, items`)
          .gte('created_at', r.start.toISOString())
          .lt('created_at', r.end.toISOString())
          .order('created_at', { ascending: true })
      ),
      fetchAll<LightOrder>(() =>
        db
          .from('orders')
          .select(LIGHT)
          .gte('created_at', r.prevStart.toISOString())
          .lt('created_at', r.prevEnd.toISOString())
          .order('created_at', { ascending: true })
      ),
      fetchAll<{ customer_phone: string; created_at: string }>(() =>
        db.from('orders').select('customer_phone, created_at').lt('created_at', r.end.toISOString()).order('created_at', { ascending: true })
      ),
      fetchAll<{ id: string; name: string; image: string; category: string }>(() =>
        db.from('products').select('id, name, image, category')
      ),
      fetchAll<CategoryRow>(() => db.from('categories').select(CATEGORY_COLUMNS)),
      db
        .from('products')
        .select('id, name, image, stock, unit, category', { count: 'exact' })
        .eq('active', true)
        .lte('stock', LOW_STOCK_THRESHOLD)
        .order('stock', { ascending: true })
        .order('name', { ascending: true })
        .limit(6),
      db.from('orders').select(await orderCols()).order('created_at', { ascending: false }).limit(6),
      getActivity(),
    ]);

  if (lowStock.error) throw toStoreError(lowStock.error);
  if (recent.error) throw toStoreError(recent.error);

  const cur = summarize(current);
  const prev = summarize(previous);

  // New customers: phone numbers whose first-ever order falls in the window.
  const firstSeen = new Map<string, number>();
  for (const o of firstOrders) {
    const key = (o.customer_phone ?? '').replace(/\D/g, '').slice(-10);
    if (!key || firstSeen.has(key)) continue;
    firstSeen.set(key, Date.parse(o.created_at));
  }
  let newCur = 0;
  let newPrev = 0;
  for (const t of firstSeen.values()) {
    if (t >= r.start.getTime() && t < r.end.getTime()) newCur += 1;
    else if (t >= r.prevStart.getTime() && t < r.prevEnd.getTime()) newPrev += 1;
  }

  // Time series.
  const granularity: OverviewData['granularity'] = r.days <= 1 ? 'hour' : 'day';
  let series: SeriesPoint[];
  if (granularity === 'hour') {
    series = Array.from({ length: 24 }, (_, h) => ({
      key: String(h),
      label: `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? 'am' : 'pm'}`,
      revenue: 0,
      orders: 0,
    }));
    for (const o of current) {
      const p = series[hourOf(o.created_at)];
      p.orders += 1;
      if (o.status !== 'Cancelled') p.revenue += num(o.total);
    }
  } else {
    const index = new Map<string, SeriesPoint>();
    series = [];
    for (let k = r.fromKey; k <= r.toKey; k = addDays(k, 1)) {
      const p = { key: k, label: formatDayKey(k), revenue: 0, orders: 0 };
      series.push(p);
      index.set(k, p);
    }
    for (const o of current) {
      const p = index.get(dayKeyOf(o.created_at));
      if (!p) continue;
      p.orders += 1;
      if (o.status !== 'Cancelled') p.revenue += num(o.total);
    }
  }

  // Status + payment split.
  const statusBreakdown = ORDER_STATUSES.map((status) => ({
    status,
    count: current.filter((o) => o.status === status).length,
  }));
  const paymentSplit = (['cod', 'sslcommerz'] as const).map((method) => {
    const list = current.filter((o) => o.status !== 'Cancelled' && o.payment_method === method);
    return { method, orders: list.length, revenue: list.reduce((s, o) => s + num(o.total), 0) };
  });

  // Top products and top-level categories from order lines.
  const productById = new Map(products.map((p) => [p.id, p]));
  const cats = categories.map(categoryFromRow);
  const catById = new Map(cats.map((c) => [c.id, c]));
  const byProduct = new Map<string, { id: string; name: string; image: string; qty: number; revenue: number }>();
  const byRoot = new Map<string, { id: string; name: string; qty: number; revenue: number }>();
  for (const o of current) {
    if (o.status === 'Cancelled' || !Array.isArray(o.items)) continue;
    for (const raw of o.items as Record<string, unknown>[]) {
      const id = String(raw?.productId ?? '');
      const qty = num(raw?.qty);
      const revenue = num(raw?.price) * qty;
      const known = productById.get(id);
      const entry = byProduct.get(id) ?? {
        id,
        name: known?.name ?? String(raw?.name ?? id),
        image: known?.image ?? String(raw?.image ?? ''),
        qty: 0,
        revenue: 0,
      };
      entry.qty += qty;
      entry.revenue += revenue;
      byProduct.set(id, entry);

      if (known) {
        const rootId = getRootId(cats, known.category);
        const root = catById.get(rootId);
        const c = byRoot.get(rootId) ?? { id: rootId, name: root?.name ?? rootId, qty: 0, revenue: 0 };
        c.qty += qty;
        c.revenue += revenue;
        byRoot.set(rootId, c);
      }
    }
  }

  return {
    range: { preset: r.preset, fromKey: r.fromKey, toKey: r.toKey, label: r.label, days: r.days },
    kpis: {
      revenue: { value: cur.revenue, previous: prev.revenue },
      orders: { value: cur.orders, previous: prev.orders },
      aov: { value: cur.aov, previous: prev.aov },
      newCustomers: { value: newCur, previous: newPrev },
      onlineShare: { value: cur.onlineShare, previous: prev.onlineShare },
    },
    series,
    granularity,
    statusBreakdown,
    paymentSplit,
    topProducts: [...byProduct.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5),
    topCategories: [...byRoot.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 6),
    lowStock: ((lowStock.data ?? []) as Pick<ProductRow, 'id' | 'name' | 'image' | 'stock' | 'unit' | 'category'>[]).map(
      (p) => ({ id: p.id, name: p.name, image: p.image ?? '', stock: num(p.stock), unit: p.unit, category: p.category })
    ),
    lowStockTotal: lowStock.count ?? 0,
    recentOrders: ((recent.data ?? []) as unknown as OrderRow[]).map(orderFromRow),
    activity,
  };
}

async function getActivity(): Promise<ActivityItem[]> {
  const db = getDb();
  const [orders, reviews, messages, subs] = await Promise.all([
    db
      .from('orders')
      .select('id, customer_name, total, status_history, created_at, updated_at')
      .order('updated_at', { ascending: false })
      .limit(12),
    db
      .from('reviews')
      .select('id, author_name, rating, created_at, product_id, products(name)')
      .order('created_at', { ascending: false })
      .limit(5),
    db.from('contact_messages').select('id, name, subject, created_at').order('created_at', { ascending: false }).limit(5),
    db.from('newsletter_subscribers').select('email, created_at').order('created_at', { ascending: false }).limit(5),
  ]);
  for (const r of [orders, reviews, messages, subs]) if (r.error) throw toStoreError(r.error);

  const items: ActivityItem[] = [];
  for (const o of (orders.data ?? []) as {
    id: string;
    customer_name: string;
    total: number | string;
    status_history: unknown;
  }[]) {
    const history = Array.isArray(o.status_history) ? (o.status_history as { status?: string; at?: string }[]) : [];
    history.forEach((e, i) => {
      if (!e?.at || !e.status) return;
      items.push(
        i === 0
          ? {
              id: `o-${o.id}-${i}`,
              kind: 'order',
              title: `New order ${o.id}`,
              detail: `${o.customer_name} · ৳${Math.round(num(o.total)).toLocaleString('en-IN')}`,
              at: e.at,
              href: `/orders/${encodeURIComponent(o.id)}`,
            }
          : {
              id: `o-${o.id}-${i}`,
              kind: 'status',
              title: `${o.id} → ${e.status}`,
              detail: o.customer_name,
              at: e.at,
              href: `/orders/${encodeURIComponent(o.id)}`,
            }
      );
    });
  }
  for (const r of (reviews.data ?? []) as unknown as {
    id: string;
    author_name: string;
    rating: number;
    created_at: string;
    products: { name: string } | { name: string }[] | null;
  }[]) {
    const product = Array.isArray(r.products) ? r.products[0] : r.products;
    items.push({
      id: `r-${r.id}`,
      kind: 'review',
      title: `${r.author_name} rated ${product?.name ?? 'a product'} ${r.rating}★`,
      at: r.created_at,
      href: '/reviews',
    });
  }
  for (const m of (messages.data ?? []) as { id: string; name: string; subject: string; created_at: string }[]) {
    items.push({
      id: `m-${m.id}`,
      kind: 'message',
      title: `Message from ${m.name}`,
      detail: m.subject || undefined,
      at: m.created_at,
      href: `/messages?id=${m.id}`,
    });
  }
  for (const s of (subs.data ?? []) as { email: string; created_at: string }[]) {
    items.push({ id: `s-${s.email}`, kind: 'subscriber', title: 'New newsletter subscriber', detail: s.email, at: s.created_at, href: '/newsletter' });
  }
  return items.sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, 12);
}

// ---------------------------------------------------------------------------
// Products, categories, coupons
// ---------------------------------------------------------------------------

export async function listCategories(): Promise<Category[]> {
  const rows = await fetchAll<CategoryRow>(() =>
    getDb().from('categories').select(CATEGORY_COLUMNS).order('sort_order', { ascending: true }).order('name', { ascending: true })
  );
  return rows.map(categoryFromRow);
}

/** Categories plus the minimum product info needed for tree counts. */
export async function getCategoriesData(): Promise<{ categories: Category[]; products: Pick<Product, 'id' | 'category'>[] }> {
  const [categories, products] = await Promise.all([
    listCategories(),
    fetchAll<{ id: string; category: string }>(() => getDb().from('products').select('id, category')),
  ]);
  return { categories, products };
}

export async function listProducts(f: ProductFilters): Promise<ProductsPage> {
  const db = getDb();
  const categories = await listCategories();
  const start = (f.page - 1) * f.pageSize;

  let q: Builder = db.from('products').select(PRODUCT_COLUMNS, { count: 'exact' });
  if (f.q) q = q.or(ilikeAny(['name', 'sku', 'id'], f.q));
  if (f.category) q = q.in('category', [...getSubtreeIds(categories, f.category)]);
  if (f.stock === 'low') q = q.gt('stock', 0).lte('stock', LOW_STOCK_THRESHOLD);
  if (f.stock === 'out') q = q.lte('stock', 0);
  if (f.stock === 'in') q = q.gt('stock', LOW_STOCK_THRESHOLD);
  if (f.status !== 'all') q = q.eq('active', f.status === 'active');
  if (f.featured) q = q.eq('featured', true);
  q = q.order(f.sort, { ascending: f.dir === 'asc' }).order('id', { ascending: true }).range(start, start + f.pageSize - 1);

  const [result, all] = await Promise.all([
    q,
    fetchAll<{ active: boolean; stock: number | string; category: string }>(() => db.from('products').select('active, stock, category')),
  ]);
  if (result.error && result.error.code !== 'PGRST103') throw toStoreError(result.error);

  const counts = { all: all.length, active: 0, hidden: 0, low: 0, out: 0 };
  for (const p of all) {
    const stock = num(p.stock);
    if (p.active) counts.active += 1;
    else counts.hidden += 1;
    if (stock <= 0) counts.out += 1;
    else if (stock <= LOW_STOCK_THRESHOLD) counts.low += 1;
  }

  const categoryTotals: Record<string, number> = {};
  for (const [id, c] of countByCategory(categories, all)) categoryTotals[id] = c.total;

  return {
    categoryTotals,
    rows: ((result.data ?? []) as ProductRow[]).map(productFromRow),
    total: result.count ?? 0,
    page: f.page,
    pageSize: f.pageSize,
    categories,
    counts,
  };
}

export async function getProduct(id: string): Promise<Product | null> {
  const row = check(
    await getDb().from('products').select(PRODUCT_COLUMNS).eq('id', id).maybeSingle()
  ) as ProductRow | null;
  return row ? productFromRow(row) : null;
}

export async function listCoupons(): Promise<Coupon[]> {
  const rows = await fetchAll<CouponRow>(() =>
    getDb().from('coupons').select(COUPON_COLUMNS).order('created_at', { ascending: false })
  );
  return rows.map(couponFromRow);
}

// ---------------------------------------------------------------------------
// Customers
// ---------------------------------------------------------------------------

interface ProfileRow {
  id: string;
  full_name: string;
  phone: string;
  address: string;
  area: string;
  city: string;
  updated_at: string;
  division?: string | null;
  district?: string | null;
  upazila?: string | null;
  union_name?: string | null;
  landmark?: string | null;
  postcode?: string | null;
}

/** All auth users (paged through the Admin API). Read only. */
async function listAuthUsers(maxPages = 20): Promise<User[]> {
  const auth = getDb().auth.admin;
  const users: User[] = [];
  for (let page = 1; page <= maxPages; page++) {
    const { data, error } = await auth.listUsers({ page, perPage: 1000 });
    if (error) {
      throw new StoreError(503, 'AUTH_ADMIN_FAILED', `Could not read accounts: ${error.message}`);
    }
    users.push(...data.users);
    if (data.users.length < 1000) break;
  }
  return users;
}

export type CustomersPage = Paged<CustomerRow> & { totals: { all: number; buyers: number; repeat: number } };

export async function listCustomers(f: CustomerFilters): Promise<CustomersPage> {
  return filterCustomers(await loadCustomerRows(), f);
}

/**
 * Every customer with order count, spend and last order. The expensive part
 * (all profiles, auth users and orders); cached by lib/cached-queries.ts and
 * shared by every segment tab, search and page.
 */
export async function loadCustomerRows(): Promise<CustomerRow[]> {
  const db = getDb();
  const pcols = await profileCols();
  const [profiles, users, orders] = await Promise.all([
    fetchAll<ProfileRow>(() => db.from('profiles').select(pcols)),
    listAuthUsers(),
    fetchAll<{ user_id: string; total: number | string; created_at: string; status: string }>(() =>
      db.from('orders').select('user_id, total, created_at, status').not('user_id', 'is', null)
    ),
  ]);

  const profileById = new Map(profiles.map((p) => [p.id, p]));
  const agg = new Map<string, { count: number; spent: number; last: string | null }>();
  for (const o of orders) {
    const a = agg.get(o.user_id) ?? { count: 0, spent: 0, last: null };
    a.count += 1;
    if (o.status !== 'Cancelled') a.spent += num(o.total);
    if (!a.last || o.created_at > a.last) a.last = o.created_at;
    agg.set(o.user_id, a);
  }

  const rows: CustomerRow[] = [];
  const seen = new Set<string>();
  for (const u of users) {
    if (isAdminAppMetadata(u.app_metadata)) continue;
    seen.add(u.id);
    const p = profileById.get(u.id);
    const a = agg.get(u.id);
    const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
    rows.push({
      id: u.id,
      name: p?.full_name || (typeof meta.full_name === 'string' ? meta.full_name : '') || (u.email ?? '').split('@')[0] || 'Customer',
      email: u.email ?? '',
      phone: p?.phone || u.phone || '',
      area: p?.upazila || p?.area || '',
      city: p?.district || p?.city || '',
      joinedAt: u.created_at ?? null,
      ordersCount: a?.count ?? 0,
      totalSpent: a?.spent ?? 0,
      lastOrderAt: a?.last ?? null,
    });
  }
  // Profiles whose auth user is gone (should not happen: FK cascade) are skipped.
  void seen;
  return rows;
}

/** Segment, search, sort and page over the full customer list (in memory). */
export function filterCustomers(rows: CustomerRow[], f: CustomerFilters): CustomersPage {
  const totals = {
    all: rows.length,
    buyers: rows.filter((r) => r.ordersCount > 0).length,
    repeat: rows.filter((r) => r.ordersCount > 1).length,
  };

  const q = f.q.toLowerCase();
  let filtered = rows.filter((r) => {
    if (f.segment === 'buyers' && r.ordersCount === 0) return false;
    if (f.segment === 'no-orders' && r.ordersCount > 0) return false;
    if (f.segment === 'repeat' && r.ordersCount < 2) return false;
    if (!q) return true;
    return [r.name, r.email, r.phone, r.area].some((v) => v.toLowerCase().includes(q));
  });

  const dirMul = f.dir === 'asc' ? 1 : -1;
  filtered = filtered.sort((a, b) => {
    let d = 0;
    if (f.sort === 'name') d = a.name.localeCompare(b.name);
    else if (f.sort === 'orders') d = a.ordersCount - b.ordersCount;
    else if (f.sort === 'spent') d = a.totalSpent - b.totalSpent;
    else d = (a.lastOrderAt ?? '').localeCompare(b.lastOrderAt ?? '');
    return d * dirMul || a.name.localeCompare(b.name);
  });

  const start = (f.page - 1) * f.pageSize;
  return {
    rows: filtered.slice(start, start + f.pageSize),
    total: filtered.length,
    page: f.page,
    pageSize: f.pageSize,
    totals,
  };
}

export async function getCustomer(id: string): Promise<CustomerDetail | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const db = getDb();
  const [pcols, ocols] = await Promise.all([profileCols(), orderCols()]);
  const [profileRes, userRes, ordersRes, reviewsRes] = await Promise.all([
    db.from('profiles').select(pcols).eq('id', id).maybeSingle(),
    db.auth.admin.getUserById(id),
    db.from('orders').select(ocols).eq('user_id', id).order('created_at', { ascending: false }),
    db
      .from('reviews')
      .select('id, product_id, rating, comment, approved, created_at, products(name)')
      .eq('user_id', id)
      .order('created_at', { ascending: false }),
  ]);
  if (profileRes.error) throw toStoreError(profileRes.error);
  if (ordersRes.error) throw toStoreError(ordersRes.error);
  if (reviewsRes.error) throw toStoreError(reviewsRes.error);

  const user = userRes.error ? null : userRes.data.user;
  const profile = profileRes.data as unknown as ProfileRow | null;
  if (!user && !profile) return null;
  if (user && isAdminAppMetadata(user.app_metadata) && !profile) return null;

  const orders = ((ordersRes.data ?? []) as unknown as OrderRow[]).map(orderFromRow);
  const live = orders.filter((o) => o.status !== 'Cancelled');
  const spent = live.reduce((s, o) => s + o.total, 0);
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;

  return {
    customer: {
      id,
      name: profile?.full_name || (typeof meta.full_name === 'string' ? meta.full_name : '') || (user?.email ?? '').split('@')[0] || 'Customer',
      email: user?.email ?? '',
      phone: profile?.phone || user?.phone || '',
      area: profile?.area ?? '',
      city: profile?.city ?? '',
      address: profile?.address ?? '',
      fullAddress: profile
        ? formatAddress({
            address: profile.address,
            landmark: profile.landmark,
            union: profile.union_name,
            upazila: profile.upazila,
            district: profile.district,
            area: profile.area,
            city: profile.city,
            postcode: profile.postcode,
          })
        : '',
      joinedAt: user?.created_at ?? null,
      lastSignInAt: user?.last_sign_in_at ?? null,
      isAdmin: isAdminAppMetadata(user?.app_metadata),
      updatedAt: profile?.updated_at ?? null,
      ordersCount: orders.length,
      totalSpent: spent,
      lastOrderAt: orders[0]?.createdAt ?? null,
    },
    orders,
    reviews: ((reviewsRes.data ?? []) as unknown as {
      id: string;
      product_id: string;
      rating: number;
      comment: string;
      approved: boolean;
      created_at: string;
      products: { name: string } | { name: string }[] | null;
    }[]).map((r) => {
      const product = Array.isArray(r.products) ? r.products[0] : r.products;
      return {
        id: r.id,
        productId: r.product_id,
        productName: product?.name ?? r.product_id,
        rating: r.rating,
        comment: r.comment,
        approved: r.approved,
        createdAt: r.created_at,
      };
    }),
    stats: {
      averageOrder: live.length ? spent / live.length : 0,
      cancelled: orders.length - live.length,
      delivered: orders.filter((o) => o.status === 'Delivered').length,
    },
  };
}

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------

interface ReviewDbRow {
  id: string;
  product_id: string;
  user_id: string;
  author_name: string;
  rating: number;
  comment: string;
  verified_purchase: boolean;
  approved: boolean;
  created_at: string;
  products: { name: string; image: string } | { name: string; image: string }[] | null;
}

export async function listReviews(f: ReviewFilters): Promise<ReviewsPage> {
  const db = getDb();
  const start = (f.page - 1) * f.pageSize;
  let q: Builder = db
    .from('reviews')
    .select(
      'id, product_id, user_id, author_name, rating, comment, verified_purchase, approved, created_at, products(name, image)',
      { count: 'exact' }
    );
  if (f.status !== 'all') q = q.eq('approved', f.status === 'approved');
  if (f.rating.length) q = q.in('rating', f.rating);
  if (f.q) q = q.or(ilikeAny(['author_name', 'comment', 'product_id'], f.q));
  q = q.order('created_at', { ascending: false }).range(start, start + f.pageSize - 1);

  const [result, all] = await Promise.all([
    q,
    fetchAll<{ approved: boolean; rating: number }>(() => db.from('reviews').select('approved, rating')),
  ]);
  if (result.error && result.error.code !== 'PGRST103') throw toStoreError(result.error);

  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as ReviewsPage['distribution'];
  let sum = 0;
  let approved = 0;
  for (const r of all) {
    const k = Math.min(5, Math.max(1, Math.round(num(r.rating)))) as 1 | 2 | 3 | 4 | 5;
    distribution[k] += 1;
    sum += num(r.rating);
    if (r.approved) approved += 1;
  }

  return {
    rows: ((result.data ?? []) as ReviewDbRow[]).map((r) => {
      const product = Array.isArray(r.products) ? r.products[0] : r.products;
      return {
        id: r.id,
        productId: r.product_id,
        productName: product?.name ?? r.product_id,
        productImage: product?.image ?? '',
        userId: r.user_id,
        authorName: r.author_name,
        rating: r.rating,
        comment: r.comment ?? '',
        verifiedPurchase: !!r.verified_purchase,
        approved: !!r.approved,
        createdAt: r.created_at,
      } satisfies ReviewRow;
    }),
    total: result.count ?? 0,
    page: f.page,
    pageSize: f.pageSize,
    counts: { all: all.length, approved, hidden: all.length - approved },
    average: all.length ? sum / all.length : 0,
    distribution,
  };
}

// ---------------------------------------------------------------------------
// Messages and newsletter
// ---------------------------------------------------------------------------

function messageFromRow(m: Record<string, unknown>): ContactMessage {
  return {
    id: String(m.id),
    name: String(m.name ?? ''),
    email: String(m.email ?? ''),
    phone: (m.phone as string | null) ?? null,
    subject: String(m.subject ?? ''),
    message: String(m.message ?? ''),
    createdAt: String(m.created_at),
    ...('read_at' in m ? { readAt: (m.read_at as string | null) ?? null } : {}),
  };
}

const MESSAGE_COLUMNS = 'id, name, email, phone, subject, message, created_at';
/** Postgres "undefined column": read_at is not migrated yet. */
const isMissingColumn = (error: unknown) => (error as { code?: string } | null)?.code === '42703';

export async function listMessages(
  f: { q: string; page: number; pageSize: number }
): Promise<Paged<ContactMessage> & { readTracking: boolean }> {
  const start = (f.page - 1) * f.pageSize;
  const run = (columns: string) => {
    let q: Builder = getDb().from('contact_messages').select(columns, { count: 'exact' });
    if (f.q) q = q.or(ilikeAny(['name', 'email', 'subject', 'message', 'phone'], f.q));
    return q.order('created_at', { ascending: false }).range(start, start + f.pageSize - 1);
  };
  let readTracking = true;
  let result = await run(`${MESSAGE_COLUMNS}, read_at`);
  if (isMissingColumn(result.error)) {
    readTracking = false;
    result = await run(MESSAGE_COLUMNS);
  }
  if (result.error && result.error.code !== 'PGRST103') throw toStoreError(result.error);
  return {
    rows: ((result.data ?? []) as unknown as Record<string, unknown>[]).map(messageFromRow),
    total: result.count ?? 0,
    page: f.page,
    pageSize: f.pageSize,
    readTracking,
  };
}

export async function getMessage(id: string): Promise<ContactMessage | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const read = (columns: string) => getDb().from('contact_messages').select(columns).eq('id', id).maybeSingle();
  let result = await read(`${MESSAGE_COLUMNS}, read_at`);
  if (isMissingColumn(result.error)) result = await read(MESSAGE_COLUMNS);
  const row = check(result) as unknown as Record<string, unknown> | null;
  return row ? messageFromRow(row) : null;
}

export async function listSubscribers(f: { q: string; page: number; pageSize: number }): Promise<
  Paged<Subscriber> & { thisMonth: number; all: number }
> {
  const db = getDb();
  const start = (f.page - 1) * f.pageSize;
  let q: Builder = db.from('newsletter_subscribers').select('email, created_at', { count: 'exact' });
  if (f.q) q = q.ilike('email', `%${f.q}%`);
  const monthAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
  const [result, all, recent] = await Promise.all([
    q.order('created_at', { ascending: false }).range(start, start + f.pageSize - 1),
    db.from('newsletter_subscribers').select('email', { count: 'exact', head: true }),
    db.from('newsletter_subscribers').select('email', { count: 'exact', head: true }).gte('created_at', monthAgo),
  ]);
  if (result.error && result.error.code !== 'PGRST103') throw toStoreError(result.error);
  return {
    rows: ((result.data ?? []) as { email: string; created_at: string }[]).map((s) => ({
      email: s.email,
      createdAt: s.created_at,
    })),
    total: result.count ?? 0,
    page: f.page,
    pageSize: f.pageSize,
    all: all.count ?? 0,
    thisMonth: recent.count ?? 0,
  };
}

export async function exportSubscribers(): Promise<Subscriber[]> {
  const rows = await fetchAll<{ email: string; created_at: string }>(() =>
    getDb().from('newsletter_subscribers').select('email, created_at').order('created_at', { ascending: false })
  );
  return rows.map((s) => ({ email: s.email, createdAt: s.created_at }));
}

// ---------------------------------------------------------------------------
// Shell: pulse (badges + bell), command palette search, admins
// ---------------------------------------------------------------------------

export async function getPulse(): Promise<Pulse> {
  const db = getDb();
  const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  const [pending, low, hidden, messages, latest] = await Promise.all([
    db.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'Pending'),
    db.from('products').select('id', { count: 'exact', head: true }).eq('active', true).lte('stock', LOW_STOCK_THRESHOLD),
    db.from('reviews').select('id', { count: 'exact', head: true }).eq('approved', false),
    db.from('contact_messages').select('id', { count: 'exact', head: true }).gte('created_at', weekAgo),
    db
      .from('orders')
      .select('id, customer_name, total, status, payment_method, created_at')
      .order('created_at', { ascending: false })
      .limit(8),
  ]);
  for (const r of [pending, low, hidden, messages, latest]) if (r.error) throw toStoreError(r.error);
  return {
    pendingOrders: pending.count ?? 0,
    lowStock: low.count ?? 0,
    hiddenReviews: hidden.count ?? 0,
    messagesThisWeek: messages.count ?? 0,
    latestOrders: ((latest.data ?? []) as {
      id: string;
      customer_name: string;
      total: number | string;
      status: OrderStatus;
      payment_method: string;
      created_at: string;
    }[]).map((o) => ({
      id: o.id,
      name: o.customer_name,
      total: num(o.total),
      status: o.status,
      paymentMethod: o.payment_method === 'sslcommerz' ? 'sslcommerz' : 'cod',
      createdAt: o.created_at,
    })),
    serverTime: new Date().toISOString(),
  };
}

export async function searchEverything(raw: string): Promise<SearchResults> {
  const q = cleanSearch(raw);
  if (q.length < 2) return { orders: [], products: [], customers: [] };
  const db = getDb();
  const digits = q.replace(/\D/g, '');
  const orderCols = ['id', 'customer_name', 'customer_phone'];
  const [orders, products, customers] = await Promise.all([
    db
      .from('orders')
      .select('id, customer_name, customer_phone, total, status, created_at')
      .or(
        digits.length >= 4 && digits.length !== q.length
          ? `${ilikeAny(orderCols, q)},customer_phone.ilike."*${digits}*"`
          : ilikeAny(orderCols, q)
      )
      .order('created_at', { ascending: false })
      .limit(6),
    db
      .from('products')
      .select('id, name, image, price, stock, active')
      .or(ilikeAny(['name', 'sku', 'id'], q))
      .order('name', { ascending: true })
      .limit(6),
    db.from('profiles').select('id, full_name, phone').or(ilikeAny(['full_name', 'phone'], q)).limit(4),
  ]);
  for (const r of [orders, products, customers]) if (r.error) throw toStoreError(r.error);

  return {
    orders: ((orders.data ?? []) as {
      id: string;
      customer_name: string;
      customer_phone: string;
      total: number | string;
      status: OrderStatus;
      created_at: string;
    }[]).map((o) => ({
      id: o.id,
      name: o.customer_name,
      phone: o.customer_phone,
      total: num(o.total),
      status: o.status,
      createdAt: o.created_at,
    })),
    products: ((products.data ?? []) as {
      id: string;
      name: string;
      image: string;
      price: number | string;
      stock: number | string;
      active: boolean;
    }[]).map((p) => ({ id: p.id, name: p.name, image: p.image ?? '', price: num(p.price), stock: num(p.stock), active: !!p.active })),
    customers: ((customers.data ?? []) as { id: string; full_name: string; phone: string }[]).map((c) => ({
      id: c.id,
      name: c.full_name || 'Customer',
      phone: c.phone ?? '',
    })),
  };
}

export async function listAdmins(): Promise<AdminAccountRow[]> {
  const users = await listAuthUsers();
  return users
    .filter((u) => isAdminAppMetadata(u.app_metadata))
    .map((u) => ({
      id: u.id,
      email: u.email ?? '',
      name: typeof u.user_metadata?.full_name === 'string' && u.user_metadata.full_name.trim() ? u.user_metadata.full_name.trim() : null,
      createdAt: u.created_at ?? null,
      lastSignInAt: u.last_sign_in_at ?? null,
    }))
    .sort((a, b) => a.email.localeCompare(b.email));
}

export async function getStoreStats(): Promise<{ products: number; categories: number; orders: number; coupons: number; customers: number }> {
  const db = getDb();
  const [products, categories, orders, coupons, customers] = await Promise.all([
    db.from('products').select('id', { count: 'exact', head: true }),
    db.from('categories').select('id', { count: 'exact', head: true }),
    db.from('orders').select('id', { count: 'exact', head: true }),
    db.from('coupons').select('code', { count: 'exact', head: true }),
    db.from('profiles').select('id', { count: 'exact', head: true }),
  ]);
  for (const r of [products, categories, orders, coupons, customers]) if (r.error) throw toStoreError(r.error);
  return {
    products: products.count ?? 0,
    categories: categories.count ?? 0,
    orders: orders.count ?? 0,
    coupons: coupons.count ?? 0,
    customers: customers.count ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Store settings
// ---------------------------------------------------------------------------

/** The original hard-coded rule; delivery_fee_for() uses the same fallback. */
export const DEFAULT_DELIVERY: DeliverySettings = { dhakaFee: 60, dhakaFreeFrom: 1000, outsideFee: 130, outsideFreeFrom: null };

export async function getDeliverySettings(): Promise<DeliverySettingsState> {
  const { data, error } = await getDb()
    .from('store_settings')
    .select('delivery_fee_dhaka, free_delivery_dhaka_from, delivery_fee_outside, free_delivery_outside_from, updated_at')
    .eq('id', 1)
    .maybeSingle();
  if (error) {
    if (NOT_READY.has(error.code ?? '')) return { settings: DEFAULT_DELIVERY, ready: false, updatedAt: null };
    throw toStoreError(error);
  }
  if (!data) return { settings: DEFAULT_DELIVERY, ready: true, updatedAt: null };
  const opt = (v: unknown) => (v === null || v === undefined ? null : num(v));
  return {
    settings: {
      dhakaFee: num(data.delivery_fee_dhaka),
      dhakaFreeFrom: opt(data.free_delivery_dhaka_from),
      outsideFee: num(data.delivery_fee_outside),
      outsideFreeFrom: opt(data.free_delivery_outside_from),
    },
    ready: true,
    updatedAt: (data.updated_at as string | null) ?? null,
  };
}
