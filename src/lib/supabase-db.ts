import 'server-only';

import {
  createClient,
  type PostgrestError,
  type SupabaseClient,
} from '@supabase/supabase-js';
import type {
  Category,
  Coupon,
  Order,
  OrderItem,
  OrderStatus,
  OrderStatusEvent,
  PaymentStatus,
  Product,
  StoreDatabase,
} from '@/types/store';
import { PAYMENT_STATUSES } from '@/types/store';
import { slugify } from './slug';

// ---------------------------------------------------------------------------
// Server-only Postgres data layer for the admin panel.
//
// Every function here talks to the tables created by `supabase/schema.sql`
// using the SECRET key (which bypasses Row Level Security). Never import this
// file from a client component.
// ---------------------------------------------------------------------------

/** An error that is safe to show to the admin user, with an HTTP status. */
export class StoreError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'StoreError';
  }
}

export const DATABASE_NOT_READY_MESSAGE =
  'The database tables do not exist yet. Run supabase/schema.sql in the Supabase SQL Editor, then run `npm run db:migrate` in grocery-store.';

let client: SupabaseClient | null = null;

function getDb(): SupabaseClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) {
    throw new StoreError(
      503,
      'SUPABASE_NOT_CONFIGURED',
      'NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set in .env.local (see .env.example).'
    );
  }
  client = createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

// PostgREST / Postgres codes meaning "the table or function is not there".
const NOT_READY_CODES = new Set(['PGRST205', 'PGRST202', '42P01', '42883']);

type ErrorOverrides = Partial<Record<string, StoreError>>;

/** Converts a PostgREST error into a StoreError the API route can return. */
function toStoreError(error: PostgrestError, overrides: ErrorOverrides = {}): StoreError {
  const code = error.code ?? '';
  const message = error.message ?? '';

  if (
    NOT_READY_CODES.has(code) ||
    /could not find the (table|function)/i.test(message) ||
    /relation .* does not exist/i.test(message)
  ) {
    return new StoreError(503, 'DATABASE_NOT_READY', DATABASE_NOT_READY_MESSAGE);
  }

  const override = overrides[code];
  if (override) return override;

  if (!code && /fetch failed|network|ECONN|ENOTFOUND|timeout/i.test(message)) {
    return new StoreError(
      503,
      'DATABASE_UNREACHABLE',
      'Could not reach Supabase. Check your internet connection and NEXT_PUBLIC_SUPABASE_URL.'
    );
  }
  if (code === 'PGRST301' || /invalid api key|jwt/i.test(message)) {
    return new StoreError(
      503,
      'SUPABASE_AUTH_FAILED',
      'Supabase rejected the server key. Check SUPABASE_SECRET_KEY in .env.local.'
    );
  }
  if (code === '23514') {
    return new StoreError(400, 'VALIDATION_ERROR', `The database rejected this value: ${message}`);
  }
  if (code === '23503') {
    return new StoreError(409, 'CONFLICT', `Other records still refer to this one: ${message}`);
  }
  if (code === '23505') {
    return new StoreError(409, 'CONFLICT', `A record with this id already exists: ${message}`);
  }

  console.error('[store] database error:', { code, message, details: error.details });
  return new StoreError(500, 'DATABASE_ERROR', message || 'Unexpected database error.');
}

// ---------------------------------------------------------------------------
// Row types (snake_case, as stored) and mappers to the camelCase app types
// ---------------------------------------------------------------------------

/** numeric columns arrive from PostgREST as numbers or strings. */
type Numeric = number | string;

interface CategoryRow {
  id: string;
  name: string;
  blurb: string;
  image: string;
}

interface ProductRow {
  id: string;
  name: string;
  category: string;
  unit: string;
  price: Numeric;
  old_price: Numeric | null;
  description: string;
  image: string;
  images: string[] | null;
  badge: string | null;
  rating: Numeric;
  review_count: Numeric;
  sku: string;
  stock: Numeric;
  sold_count: Numeric;
  featured: boolean;
  active: boolean;
  origin: string | null;
  nutrition: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

interface CouponRow {
  code: string;
  label: string;
  discount_type: string;
  value: Numeric;
  max_discount: Numeric | null;
  min_subtotal: Numeric;
  active: boolean;
  starts_at: string | null;
  expires_at: string | null;
  usage_limit: Numeric | null;
  used_count: Numeric;
}

interface OrderRow {
  id: string;
  user_id: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  customer_address: string;
  customer_area: string;
  customer_city: string;
  delivery_slot: string;
  notes: string | null;
  items: unknown;
  subtotal: Numeric;
  discount: Numeric;
  coupon_code: string | null;
  delivery_fee: Numeric;
  total: Numeric;
  payment_method: string;
  payment_status: string | null;
  payment_tran_id: string | null;
  paid_at: string | null;
  status: string;
  status_history: unknown;
  created_at: string;
  updated_at: string;
}

// Explicit column lists: `orders.access_token` (the guest order-page secret)
// must never be sent to the browser, so we do not `select('*')`.
const CATEGORY_COLUMNS = 'id, name, blurb, image';
const PRODUCT_COLUMNS =
  'id, name, category, unit, price, old_price, description, image, images, badge, rating, review_count, sku, stock, sold_count, featured, active, origin, nutrition, tags, created_at, updated_at';
const COUPON_COLUMNS =
  'code, label, discount_type, value, max_discount, min_subtotal, active, starts_at, expires_at, usage_limit, used_count';
const ORDER_COLUMNS =
  'id, user_id, customer_name, customer_phone, customer_email, customer_address, customer_area, customer_city, delivery_slot, notes, items, subtotal, discount, coupon_code, delivery_fee, total, payment_method, payment_status, payment_tran_id, paid_at, status, status_history, created_at, updated_at';

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function optNum(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function categoryFromRow(row: CategoryRow): Category {
  return { id: row.id, name: row.name, blurb: row.blurb, image: row.image };
}

function productFromRow(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    unit: row.unit,
    price: num(row.price),
    oldPrice: optNum(row.old_price),
    description: row.description ?? '',
    image: row.image ?? '',
    images: row.images ?? [],
    badge: row.badge ?? undefined,
    rating: num(row.rating),
    reviewCount: num(row.review_count),
    sku: row.sku ?? '',
    stock: num(row.stock),
    soldCount: num(row.sold_count),
    featured: !!row.featured,
    active: !!row.active,
    origin: row.origin ?? undefined,
    nutrition: row.nutrition ?? undefined,
    tags: row.tags ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function couponFromRow(row: CouponRow): Coupon {
  return {
    code: row.code,
    label: row.label,
    discountType: row.discount_type === 'percent' ? 'percent' : 'fixed',
    value: num(row.value),
    maxDiscount: optNum(row.max_discount),
    minSubtotal: num(row.min_subtotal),
    active: !!row.active,
    startsAt: row.starts_at,
    expiresAt: row.expires_at,
    usageLimit: optNum(row.usage_limit) ?? null,
    usedCount: num(row.used_count),
  };
}

function orderItemsFromJson(value: unknown): OrderItem[] {
  if (!Array.isArray(value)) return [];
  return value.map((raw) => {
    const item = (raw ?? {}) as Record<string, unknown>;
    return {
      productId: String(item.productId ?? ''),
      name: String(item.name ?? ''),
      unit: String(item.unit ?? ''),
      price: num(item.price),
      qty: num(item.qty),
      image: String(item.image ?? ''),
    };
  });
}

function statusHistoryFromJson(value: unknown): OrderStatusEvent[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((raw) => (raw ?? {}) as Record<string, unknown>)
    .filter((e) => typeof e.status === 'string' && typeof e.at === 'string')
    .map((e) => ({ status: e.status as OrderStatus, at: e.at as string }));
}

function orderFromRow(row: OrderRow): Order {
  return {
    id: row.id,
    createdAt: row.created_at,
    customer: {
      name: row.customer_name,
      phone: row.customer_phone,
      email: row.customer_email ?? undefined,
      address: row.customer_address,
      area: row.customer_area,
      city: row.customer_city,
      deliverySlot: row.delivery_slot,
      notes: row.notes ?? undefined,
    },
    items: orderItemsFromJson(row.items),
    subtotal: num(row.subtotal),
    discount: num(row.discount),
    couponCode: row.coupon_code ?? undefined,
    deliveryFee: num(row.delivery_fee),
    total: num(row.total),
    paymentMethod: row.payment_method === 'sslcommerz' ? 'sslcommerz' : 'cod',
    paymentStatus: PAYMENT_STATUSES.includes(row.payment_status as PaymentStatus)
      ? (row.payment_status as PaymentStatus)
      : 'unpaid',
    paidAt: row.paid_at ?? undefined,
    paymentTranId: row.payment_tran_id ?? undefined,
    status: row.status as OrderStatus,
    statusHistory: statusHistoryFromJson(row.status_history),
    userId: row.user_id,
    updatedAt: row.updated_at,
  };
}

// ---------------------------------------------------------------------------
// Validated write inputs (produced by src/lib/store-validation.ts)
// ---------------------------------------------------------------------------

export interface ProductWrite {
  name: string;
  category: string;
  unit: string;
  price: number;
  oldPrice: number | null;
  description: string;
  image: string;
  /** undefined = leave the stored gallery untouched. */
  images?: string[];
  badge: string | null;
  sku: string;
  stock: number;
  featured: boolean;
  active: boolean;
  origin: string | null;
  nutrition: string | null;
  /** undefined = leave the stored tags untouched. */
  tags?: string[];
  /** Only used when a product is first created; reviews own it afterwards. */
  initialRating?: number;
}

export interface CategoryWrite {
  id: string;
  name: string;
  blurb: string;
  image: string;
}

export interface CouponWrite {
  code: string;
  label: string;
  discountType: 'percent' | 'fixed';
  value: number;
  maxDiscount: number | null;
  minSubtotal: number;
  active: boolean;
  /** undefined = leave the stored value untouched; null = clear it. */
  startsAt?: string | null;
  expiresAt?: string | null;
  usageLimit?: number | null;
}

function productToRow(input: ProductWrite): Record<string, unknown> {
  const row: Record<string, unknown> = {
    name: input.name,
    category: input.category,
    unit: input.unit,
    price: input.price,
    old_price: input.oldPrice,
    description: input.description,
    image: input.image,
    badge: input.badge,
    sku: input.sku,
    stock: input.stock,
    featured: input.featured,
    active: input.active,
    origin: input.origin,
    nutrition: input.nutrition,
    updated_at: new Date().toISOString(),
  };
  if (input.images !== undefined) row.images = input.images;
  if (input.tags !== undefined) row.tags = input.tags;
  return row;
}

function unknownCategoryError(category: string): StoreError {
  return new StoreError(
    400,
    'VALIDATION_ERROR',
    `Category "${category}" does not exist. Pick an existing category or create it first.`
  );
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/** Loads everything the admin UI shows, in the shape it has always used. */
export async function readStore(): Promise<StoreDatabase> {
  const db = getDb();
  const [categories, products, coupons, orders] = await Promise.all([
    db
      .from('categories')
      .select(CATEGORY_COLUMNS)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true }),
    db
      .from('products')
      .select(PRODUCT_COLUMNS)
      .order('created_at', { ascending: false })
      .order('id', { ascending: true }),
    db.from('coupons').select(COUPON_COLUMNS).order('created_at', { ascending: true }),
    db.from('orders').select(ORDER_COLUMNS).order('created_at', { ascending: false }),
  ]);

  for (const result of [categories, products, coupons, orders]) {
    if (result.error) throw toStoreError(result.error);
  }

  return {
    categories: ((categories.data ?? []) as unknown as CategoryRow[]).map(categoryFromRow),
    products: ((products.data ?? []) as unknown as ProductRow[]).map(productFromRow),
    coupons: ((coupons.data ?? []) as unknown as CouponRow[]).map(couponFromRow),
    orders: ((orders.data ?? []) as unknown as OrderRow[]).map(orderFromRow),
    updatedAt: new Date().toISOString(),
  };
}

export async function productExists(id: string): Promise<boolean> {
  const { data, error } = await getDb().from('products').select('id').eq('id', id).limit(1);
  if (error) throw toStoreError(error);
  return (data ?? []).length > 0;
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

/**
 * Inserts a new product. The id is a slug of `wantedId` (or of the name) and
 * is made unique by appending -2, -3, … — it never overwrites an existing row.
 * Returns the id that was actually used.
 */
export async function insertProduct(input: ProductWrite, wantedId?: string): Promise<string> {
  const db = getDb();
  const base = slugify(wantedId ?? '') || slugify(input.name) || 'product';

  // `base` only contains a-z, 0-9 and hyphens, so it is safe inside LIKE.
  const existing = await db.from('products').select('id').like('id', `${base}%`);
  if (existing.error) throw toStoreError(existing.error);
  const taken = new Set(((existing.data ?? []) as { id: string }[]).map((r) => r.id));

  const row = productToRow(input);
  if (input.initialRating !== undefined) row.rating = input.initialRating;

  let suffix = 1;
  for (let attempt = 0; attempt < 5; attempt++) {
    let id = base;
    while (taken.has(id)) {
      suffix += 1;
      id = `${base}-${suffix}`;
    }
    const { error } = await db.from('products').insert({ id, ...row });
    if (!error) return id;
    if (error.code === '23505') {
      // Someone else took this id between our check and the insert: try the next.
      taken.add(id);
      continue;
    }
    throw toStoreError(error, { '23503': unknownCategoryError(input.category) });
  }
  throw new StoreError(409, 'CONFLICT', 'Could not find a free product id. Please try again.');
}

async function patchProduct(
  id: string,
  patch: Record<string, unknown>,
  overrides: ErrorOverrides = {}
): Promise<void> {
  const { data, error } = await getDb()
    .from('products')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id');
  if (error) throw toStoreError(error, overrides);
  if (!data || data.length === 0) {
    throw new StoreError(404, 'NOT_FOUND', `Product "${id}" no longer exists. Refresh and try again.`);
  }
}

/** Updates an existing product in place. The id is never changed. */
export async function updateProduct(id: string, input: ProductWrite): Promise<void> {
  await patchProduct(id, productToRow(input), {
    '23503': unknownCategoryError(input.category),
  });
}

export async function setProductActive(id: string, active: boolean): Promise<void> {
  await patchProduct(id, { active });
}

export async function setProductFeatured(id: string, featured: boolean): Promise<void> {
  await patchProduct(id, { featured });
}

export async function setProductStock(id: string, stock: number, price?: number): Promise<void> {
  await patchProduct(id, price === undefined ? { stock } : { stock, price });
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await getDb().from('products').delete().eq('id', id);
  if (error) throw toStoreError(error);
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export async function saveCategory(input: CategoryWrite): Promise<void> {
  // sort_order is deliberately not sent, so an existing category keeps its position.
  const { error } = await getDb()
    .from('categories')
    .upsert(
      { id: input.id, name: input.name, blurb: input.blurb, image: input.image },
      { onConflict: 'id' }
    );
  if (error) throw toStoreError(error);
}

export async function deleteCategory(id: string): Promise<void> {
  const db = getDb();
  const { error } = await db.from('categories').delete().eq('id', id);
  if (!error) return;

  if (error.code === '23503') {
    // products.category is ON DELETE RESTRICT: say how many are in the way.
    const { count } = await db
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('category', id);
    const what =
      count === 1 ? 'the 1 product' : count ? `the ${count} products` : 'the products';
    throw new StoreError(
      409,
      'CATEGORY_NOT_EMPTY',
      `Move or delete ${what} in this category first.`
    );
  }
  throw toStoreError(error);
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

/** Goes through the `set_order_status` SQL function (history + stock restore). */
export async function setOrderStatus(id: string, status: OrderStatus): Promise<void> {
  const { error } = await getDb().rpc('set_order_status', { p_id: id, p_status: status });
  if (!error) return;
  if (/ORDER_NOT_FOUND/.test(error.message ?? '')) {
    throw new StoreError(404, 'NOT_FOUND', `Order "${id}" no longer exists. Refresh and try again.`);
  }
  throw toStoreError(error);
}

export async function deleteOrder(id: string): Promise<void> {
  const { error } = await getDb().from('orders').delete().eq('id', id);
  if (error) throw toStoreError(error);
}

// ---------------------------------------------------------------------------
// Coupons
// ---------------------------------------------------------------------------

export async function saveCoupon(input: CouponWrite): Promise<void> {
  // used_count is never sent: only place_order may change it.
  const row: Record<string, unknown> = {
    code: input.code,
    label: input.label,
    discount_type: input.discountType,
    value: input.value,
    max_discount: input.maxDiscount,
    min_subtotal: input.minSubtotal,
    active: input.active,
  };
  if (input.startsAt !== undefined) row.starts_at = input.startsAt;
  if (input.expiresAt !== undefined) row.expires_at = input.expiresAt;
  if (input.usageLimit !== undefined) row.usage_limit = input.usageLimit;

  const { error } = await getDb().from('coupons').upsert(row, { onConflict: 'code' });
  if (error) throw toStoreError(error);
}

export async function deleteCoupon(code: string): Promise<void> {
  const { error } = await getDb().from('coupons').delete().eq('code', code);
  if (error) throw toStoreError(error);
}
