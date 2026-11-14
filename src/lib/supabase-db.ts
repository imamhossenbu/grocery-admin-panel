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
} from '@/types/store';
import { PAYMENT_STATUSES } from '@/types/store';
import { slugify } from './slug';
import { MAX_CATEGORY_DEPTH, checkParent, type ParentCheck } from './category-tree';

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

export function getDb(): SupabaseClient {
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
export function toStoreError(error: PostgrestError, overrides: ErrorOverrides = {}): StoreError {
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

export interface CategoryRow {
  id: string;
  name: string;
  blurb: string;
  image: string;
  parent_id: string | null;
  description: string | null;
  sort_order: Numeric | null;
}

export interface ProductRow {
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

export interface CouponRow {
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

export interface OrderRow {
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
  // Structured address columns (added by a later migration; may be absent).
  customer_division?: string | null;
  customer_district?: string | null;
  customer_upazila?: string | null;
  customer_union?: string | null;
}

// Explicit column lists: `orders.access_token` (the guest order-page secret)
// must never be sent to the browser, so we do not `select('*')`.
export const CATEGORY_COLUMNS = 'id, name, blurb, image, parent_id, description, sort_order';
export const PRODUCT_COLUMNS =
  'id, name, category, unit, price, old_price, description, image, images, badge, rating, review_count, sku, stock, sold_count, featured, active, origin, nutrition, tags, created_at, updated_at';
export const COUPON_COLUMNS =
  'code, label, discount_type, value, max_discount, min_subtotal, active, starts_at, expires_at, usage_limit, used_count';
export const ORDER_COLUMNS =
  'id, user_id, customer_name, customer_phone, customer_email, customer_address, customer_area, customer_city, delivery_slot, notes, items, subtotal, discount, coupon_code, delivery_fee, total, payment_method, payment_status, payment_tran_id, paid_at, status, status_history, created_at, updated_at';

/** Optional structured-address columns; read only when the migration has run. */
export const ORDER_ADDRESS_COLUMNS = 'customer_division, customer_district, customer_upazila, customer_union';

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function optNum(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

export function categoryFromRow(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    blurb: row.blurb ?? '',
    image: row.image ?? '',
    parentId: row.parent_id ?? null,
    description: row.description ?? '',
    sortOrder: num(row.sort_order),
  };
}

export function productFromRow(row: ProductRow): Product {
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

export function couponFromRow(row: CouponRow): Coupon {
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

export function orderFromRow(row: OrderRow): Order {
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
      division: row.customer_division ?? undefined,
      district: row.customer_district ?? undefined,
      upazila: row.customer_upazila ?? undefined,
      union: row.customer_union ?? undefined,
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
  /** For every optional field: undefined = leave the stored value untouched. */
  blurb?: string;
  image?: string;
  description?: string;
  /** null = top level. */
  parentId?: string | null;
  /** true = must create (409 if the slug is taken); false = must update; undefined = upsert. */
  isNew?: boolean;
}

export interface CategoryReorder {
  /** The parent whose children are being reordered (null = top level). */
  parentId: string | null;
  /** Every child of that parent, in the new order. */
  ids: string[];
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

/** Shows or hides many products at once. Returns how many rows changed. */
export async function setProductsActive(ids: string[], active: boolean): Promise<number> {
  const { data, error } = await getDb()
    .from('products')
    .update({ active, updated_at: new Date().toISOString() })
    .in('id', ids)
    .select('id');
  if (error) throw toStoreError(error);
  return data?.length ?? 0;
}

/** Moves many products into one category. */
export async function setProductsCategory(ids: string[], category: string): Promise<number> {
  const { data, error } = await getDb()
    .from('products')
    .update({ category, updated_at: new Date().toISOString() })
    .in('id', ids)
    .select('id');
  if (error) throw toStoreError(error, { '23503': unknownCategoryError(category) });
  return data?.length ?? 0;
}

/** Deletes many products. Order history keeps its own copy of each line. */
export async function deleteProducts(ids: string[]): Promise<number> {
  const { data, error } = await getDb().from('products').delete().in('id', ids).select('id');
  if (error) throw toStoreError(error);
  return data?.length ?? 0;
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

export const CATEGORY_CYCLE_MESSAGE =
  'A category can’t be moved under itself or one of its subcategories.';
export const CATEGORY_TOO_DEEP_MESSAGE = `Categories can be at most ${MAX_CATEGORY_DEPTH} levels deep.`;

function categoryTreeError(reason: Exclude<ParentCheck, { ok: true }>['reason'], parentId: string) {
  switch (reason) {
    case 'SELF':
    case 'CYCLE':
      return new StoreError(400, 'CATEGORY_CYCLE', CATEGORY_CYCLE_MESSAGE);
    case 'TOO_DEEP':
      return new StoreError(400, 'CATEGORY_TOO_DEEP', CATEGORY_TOO_DEEP_MESSAGE);
    case 'NOT_FOUND':
      return new StoreError(
        400,
        'VALIDATION_ERROR',
        `Parent category "${parentId}" does not exist. Refresh and pick another parent.`
      );
  }
}

/** Maps the tree trigger's exceptions (and parent FK failures) to clear messages. */
function toCategoryError(error: PostgrestError, parentId?: string | null): StoreError {
  const message = error.message ?? '';
  if (/CATEGORY_CYCLE/.test(message) || /categories_not_own_parent/.test(message)) {
    return new StoreError(400, 'CATEGORY_CYCLE', CATEGORY_CYCLE_MESSAGE);
  }
  if (/CATEGORY_TOO_DEEP/.test(message)) {
    return new StoreError(400, 'CATEGORY_TOO_DEEP', CATEGORY_TOO_DEEP_MESSAGE);
  }
  if (error.code === '23503' && parentId) {
    return categoryTreeError('NOT_FOUND', parentId);
  }
  return toStoreError(error);
}

type CategoryLinkRow = { id: string; parent_id: string | null; sort_order: Numeric | null };

/** The (small) id/parent/sort table, used to validate tree changes before writing. */
async function readCategoryLinks(): Promise<
  { id: string; parentId: string | null; sortOrder: number }[]
> {
  const { data, error } = await getDb().from('categories').select('id, parent_id, sort_order');
  if (error) throw toStoreError(error);
  return ((data ?? []) as CategoryLinkRow[]).map((r) => ({
    id: r.id,
    parentId: r.parent_id ?? null,
    sortOrder: num(r.sort_order),
  }));
}

/** sort_order that puts a category after its future siblings. */
function nextSortOrder(
  links: { id: string; parentId: string | null; sortOrder: number }[],
  parentId: string | null,
  selfId: string
): number {
  const siblings = links.filter((l) => l.parentId === parentId && l.id !== selfId);
  return siblings.length ? Math.max(...siblings.map((s) => s.sortOrder)) + 1 : 0;
}

/**
 * Creates or updates a category. Only the fields present in `input` are
 * written, so a partial save never wipes blurb/image/description/parent.
 * A new category, or one moved to another parent, goes to the end of its
 * sibling list.
 */
export async function saveCategory(input: CategoryWrite): Promise<void> {
  const db = getDb();
  const links = await readCategoryLinks();
  const existing = links.find((l) => l.id === input.id);

  if (input.isNew === true && existing) {
    throw new StoreError(
      409,
      'CONFLICT',
      `A category with the slug "${input.id}" already exists. Choose another slug.`
    );
  }
  if (input.isNew === false && !existing) {
    throw new StoreError(404, 'NOT_FOUND', `Category "${input.id}" no longer exists. Refresh and try again.`);
  }

  const parentChanges =
    input.parentId !== undefined && (existing?.parentId ?? null) !== input.parentId;
  if (parentChanges && input.parentId) {
    const check = checkParent(links, input.id, input.parentId);
    if (!check.ok) throw categoryTreeError(check.reason, input.parentId);
  }

  const row: Record<string, unknown> = { name: input.name };
  if (input.blurb !== undefined) row.blurb = input.blurb;
  if (input.image !== undefined) row.image = input.image;
  if (input.description !== undefined) row.description = input.description;
  if (input.parentId !== undefined) row.parent_id = input.parentId;

  if (existing) {
    if (parentChanges) {
      row.sort_order = nextSortOrder(links, input.parentId ?? null, input.id);
    }
    const { data, error } = await db
      .from('categories')
      .update(row)
      .eq('id', input.id)
      .select('id');
    if (error) throw toCategoryError(error, input.parentId);
    if (!data || data.length === 0) {
      throw new StoreError(404, 'NOT_FOUND', `Category "${input.id}" no longer exists. Refresh and try again.`);
    }
    return;
  }

  row.sort_order = nextSortOrder(links, input.parentId ?? null, input.id);
  const { error } = await db.from('categories').insert({ id: input.id, ...row });
  if (!error) return;
  if (error.code === '23505') {
    throw new StoreError(
      409,
      'CONFLICT',
      `A category with the slug "${input.id}" already exists. Choose another slug.`
    );
  }
  throw toCategoryError(error, input.parentId);
}

/**
 * Writes sort_order 0..n-1 for one complete sibling list in a single
 * statement. Rejects the request if the list does not match the current
 * children of `parentId` (someone else changed the tree meanwhile).
 */
export async function reorderCategories({ parentId, ids }: CategoryReorder): Promise<void> {
  const db = getDb();
  const { data, error } = await db.from('categories').select('id, name, parent_id');
  if (error) throw toStoreError(error);
  const rows = (data ?? []) as { id: string; name: string; parent_id: string | null }[];

  if (parentId !== null && !rows.some((r) => r.id === parentId)) {
    throw categoryTreeError('NOT_FOUND', parentId);
  }
  const current = rows.filter((r) => (r.parent_id ?? null) === parentId);
  const wanted = new Set(ids);
  if (current.length !== ids.length || current.some((r) => !wanted.has(r.id))) {
    throw new StoreError(
      409,
      'CONFLICT',
      'The category list changed since it was loaded. Refresh and try again.'
    );
  }

  // An upsert with only (id, name, sort_order) updates just those columns of
  // existing rows; `name` is included because the insert half of an upsert
  // must satisfy NOT NULL. Every id was checked to exist above.
  const nameById = new Map(current.map((r) => [r.id, r.name]));
  const { error: writeError } = await db
    .from('categories')
    .upsert(
      ids.map((id, index) => ({ id, name: nameById.get(id)!, sort_order: index })),
      { onConflict: 'id' }
    );
  if (writeError) throw toCategoryError(writeError);
}

export async function deleteCategory(id: string): Promise<void> {
  const db = getDb();

  // categories.parent_id is ON DELETE RESTRICT: check children first so the
  // message can say what is in the way.
  const children = await db
    .from('categories')
    .select('id', { count: 'exact', head: true })
    .eq('parent_id', id);
  if (children.error) throw toStoreError(children.error);
  if (children.count) throw subcategoriesInTheWay(children.count);

  const { error } = await db.from('categories').delete().eq('id', id);
  if (!error) return;

  if (error.code === '23503') {
    // products.category is ON DELETE RESTRICT: say how many are in the way.
    const { count } = await db
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('category', id);
    if (!count) {
      // Not products, so a subcategory was added in the meantime.
      const again = await db
        .from('categories')
        .select('id', { count: 'exact', head: true })
        .eq('parent_id', id);
      if (again.count) throw subcategoriesInTheWay(again.count);
    }
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

function subcategoriesInTheWay(count: number): StoreError {
  return new StoreError(
    409,
    'CATEGORY_HAS_CHILDREN',
    count === 1
      ? 'Move or delete its 1 subcategory first.'
      : `Move or delete its ${count} subcategories first.`
  );
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

/**
 * Updates many orders one by one through set_order_status (each keeps its
 * own history entry and stock bookkeeping). Stops at the first failure and
 * reports how far it got.
 */
export async function setOrdersStatus(ids: string[], status: OrderStatus): Promise<number> {
  let done = 0;
  for (const id of ids) {
    try {
      await setOrderStatus(id, status);
      done += 1;
    } catch (err) {
      if (err instanceof StoreError && done > 0) {
        throw new StoreError(
          err.status,
          err.code,
          `${done} of ${ids.length} orders were updated, then: ${err.message}`
        );
      }
      throw err;
    }
  }
  return done;
}

/**
 * Records that the money of a paid-but-cancelled online order was returned
 * (payment_status 'paid' -> 'refunded'). Only allowed in that exact state.
 */
export async function markOrderRefunded(id: string): Promise<void> {
  const { data, error } = await getDb()
    .from('orders')
    .update({ payment_status: 'refunded', updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('payment_status', 'paid')
    .eq('status', 'Cancelled')
    .select('id');
  if (error) throw toStoreError(error);
  if (!data || data.length === 0) {
    throw new StoreError(
      409,
      'CONFLICT',
      'Only a cancelled order that was paid online can be marked as refunded. Refresh and try again.'
    );
  }
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

// ---------------------------------------------------------------------------
// Reviews (moderation)
// ---------------------------------------------------------------------------

/** Approve (show on the storefront) or hide a review. The rating trigger updates the product. */
export async function setReviewApproved(id: string, approved: boolean): Promise<void> {
  const { data, error } = await getDb()
    .from('reviews')
    .update({ approved })
    .eq('id', id)
    .select('id');
  if (error) throw toStoreError(error);
  if (!data || data.length === 0) {
    throw new StoreError(404, 'NOT_FOUND', 'This review no longer exists. Refresh and try again.');
  }
}

export async function deleteReview(id: string): Promise<void> {
  const { error } = await getDb().from('reviews').delete().eq('id', id);
  if (error) throw toStoreError(error);
}

export async function deleteCoupon(code: string): Promise<void> {
  const { error } = await getDb().from('coupons').delete().eq('code', code);
  if (error) throw toStoreError(error);
}

/** Marks a contact-form message read (now) or unread (null). */
export async function setMessageRead(id: string, read: boolean): Promise<void> {
  const { error } = await getDb()
    .from('contact_messages')
    .update({ read_at: read ? new Date().toISOString() : null })
    .eq('id', id);
  if (error?.code === '42703') {
    throw new StoreError(
      503,
      'DATABASE_NOT_READY',
      'Read state needs the contact_messages.read_at column. Run supabase/schema.sql in the Supabase SQL Editor.'
    );
  }
  if (error) throw toStoreError(error);
}
