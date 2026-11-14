import 'server-only';

import type { DeliverySettings } from '@/types/admin';
import { ORDER_STATUSES, type OrderStatus } from '@/types/store';
import {
  CATEGORY_CYCLE_MESSAGE,
  StoreError,
  type CategoryReorder,
  type CategoryWrite,
  type CouponWrite,
  type ProductWrite,
} from './supabase-db';

// Server-side validation of the `payload` of each /api/store action. Every
// function either returns clean, typed data or throws a 400 StoreError whose
// message is shown to the admin in a toast.

type Payload = Record<string, unknown>;

// numeric(10,2) columns hold at most 99,999,999.99.
const MAX_MONEY = 99_999_999.99;
const MAX_INT = 2_147_483_647;

function invalid(message: string): StoreError {
  return new StoreError(400, 'VALIDATION_ERROR', message);
}

export function asPayload(value: unknown): Payload {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw invalid('Request payload must be a JSON object.');
  }
  return value as Payload;
}

function requiredString(p: Payload, key: string, label: string, max = 500): string {
  const value = p[key];
  if (typeof value !== 'string' || !value.trim()) {
    throw invalid(`${label} is required.`);
  }
  const trimmed = value.trim();
  if (trimmed.length > max) throw invalid(`${label} must be at most ${max} characters.`);
  return trimmed;
}

function optionalString(p: Payload, key: string, label: string, max = 5000): string | null {
  const value = p[key];
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') throw invalid(`${label} must be text.`);
  const trimmed = value.trim();
  if (trimmed.length > max) throw invalid(`${label} must be at most ${max} characters.`);
  return trimmed || null;
}

function money(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw invalid(`${label} must be a number.`);
  }
  if (value < 0) throw invalid(`${label} cannot be negative.`);
  if (value > MAX_MONEY) throw invalid(`${label} is too large.`);
  return Math.round(value * 100) / 100;
}

function optionalMoney(value: unknown, label: string): number | null {
  if (value === undefined || value === null) return null;
  return money(value, label);
}

function wholeNumber(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw invalid(`${label} must be a whole number.`);
  }
  if (value < 0) throw invalid(`${label} cannot be negative.`);
  if (value > MAX_INT) throw invalid(`${label} is too large.`);
  return value;
}

function bool(value: unknown, label: string): boolean {
  if (typeof value !== 'boolean') throw invalid(`${label} must be true or false.`);
  return value;
}

function optionalStringList(value: unknown, label: string): string[] | undefined {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value) || value.some((v) => typeof v !== 'string')) {
    throw invalid(`${label} must be a list of text values.`);
  }
  if (value.length > 50) throw invalid(`${label} can have at most 50 entries.`);
  return (value as string[]).map((v) => v.trim()).filter(Boolean);
}

function optionalTimestamp(value: unknown, label: string): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) {
    throw invalid(`${label} must be a valid date.`);
  }
  return new Date(value).toISOString();
}

export function parseId(p: Payload, key: 'id' | 'code' = 'id', label = 'Id'): string {
  return requiredString(p, key, label, 200);
}

export function parseProduct(p: Payload): ProductWrite {
  const price = money(p.price, 'Price');
  const oldPrice = optionalMoney(p.oldPrice, 'Old price');
  const rating = p.rating;
  if (
    rating !== undefined &&
    rating !== null &&
    (typeof rating !== 'number' || !Number.isFinite(rating) || rating < 0 || rating > 5)
  ) {
    throw invalid('Rating must be a number between 0 and 5.');
  }

  return {
    name: requiredString(p, 'name', 'Product name', 200),
    category: requiredString(p, 'category', 'Category', 200),
    unit: requiredString(p, 'unit', 'Unit', 100),
    price,
    oldPrice,
    description: optionalString(p, 'description', 'Description') ?? '',
    image: optionalString(p, 'image', 'Image URL', 2000) ?? '',
    images: optionalStringList(p.images, 'Gallery images'),
    badge: optionalString(p, 'badge', 'Badge', 100),
    sku: optionalString(p, 'sku', 'SKU', 100) ?? '',
    stock: wholeNumber(p.stock, 'Stock'),
    featured: bool(p.featured, 'Featured'),
    active: bool(p.active, 'Active'),
    origin: optionalString(p, 'origin', 'Origin', 500),
    nutrition: optionalString(p, 'nutrition', 'Nutrition', 2000),
    tags: optionalStringList(p.tags, 'Tags'),
    initialRating: typeof rating === 'number' ? Math.round(rating * 10) / 10 : undefined,
  };
}

export function parseToggle(p: Payload, key: 'active' | 'featured'): { id: string; value: boolean } {
  return { id: parseId(p, 'id', 'Product id'), value: bool(p[key], key) };
}

export function parseQuickStock(p: Payload): { id: string; stock: number; price?: number } {
  return {
    id: parseId(p, 'id', 'Product id'),
    stock: wholeNumber(p.stock, 'Stock'),
    price: p.price === undefined || p.price === null ? undefined : money(p.price, 'Price'),
  };
}

/** Absent key → undefined (leave untouched); null/blank → ''. */
function patchString(p: Payload, key: string, label: string, max: number): string | undefined {
  if (!(key in p) || p[key] === undefined) return undefined;
  return optionalString(p, key, label, max) ?? '';
}

const CATEGORY_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Absent → undefined (leave untouched); null/'' → null (top level). */
function parseParentId(p: Payload, selfId: string): string | null | undefined {
  if (!('parentId' in p) || p.parentId === undefined) return undefined;
  const value = p.parentId;
  if (value === null || value === '') return null;
  if (typeof value !== 'string') throw invalid('Parent category must be a category id.');
  const parentId = value.trim();
  if (!parentId) return null;
  if (parentId.length > 100) throw invalid('Parent category id is too long.');
  if (parentId === selfId) {
    throw new StoreError(400, 'CATEGORY_CYCLE', CATEGORY_CYCLE_MESSAGE);
  }
  return parentId;
}

export function parseCategory(p: Payload): CategoryWrite {
  const id = requiredString(p, 'id', 'Category id', 100);
  if (/\s/.test(id)) throw invalid('Category id cannot contain spaces.');
  const isNew = p.isNew === undefined || p.isNew === null ? undefined : bool(p.isNew, 'isNew');
  // Category ids appear in storefront URLs; new ones must be clean slugs.
  // (Older ids are left alone so existing categories stay editable.)
  if (isNew && !CATEGORY_SLUG.test(id)) {
    throw invalid('Category slug may only contain lowercase letters, digits and single hyphens.');
  }
  return {
    id,
    name: requiredString(p, 'name', 'Category name', 200),
    blurb: patchString(p, 'blurb', 'Blurb', 500),
    image: patchString(p, 'image', 'Image URL', 2000),
    description: patchString(p, 'description', 'Description', 5000),
    parentId: parseParentId(p, id),
    isNew,
  };
}

export function parseCategoryReorder(p: Payload): CategoryReorder {
  const parentId = parseParentId(p, '') ?? null;
  const ids = p.ids;
  if (!Array.isArray(ids) || ids.length === 0) {
    throw invalid('ids must be a non-empty list of category ids.');
  }
  if (ids.length > 500) throw invalid('Too many categories in one reorder.');
  if (ids.some((v) => typeof v !== 'string' || !v.trim())) {
    throw invalid('ids must be a list of category ids.');
  }
  const clean = (ids as string[]).map((v) => v.trim());
  if (new Set(clean).size !== clean.length) throw invalid('ids must not contain duplicates.');
  if (parentId !== null && clean.includes(parentId)) {
    throw invalid('A category cannot be listed among its own children.');
  }
  return { parentId, ids: clean };
}

export function parseOrderStatus(p: Payload): { id: string; status: OrderStatus } {
  const id = parseId(p, 'id', 'Order id');
  const status = p.status;
  if (typeof status !== 'string' || !ORDER_STATUSES.includes(status as OrderStatus)) {
    throw invalid(`Status must be one of: ${ORDER_STATUSES.join(', ')}.`);
  }
  return { id, status: status as OrderStatus };
}

export function parseCouponCode(p: Payload): string {
  return parseId(p, 'code', 'Coupon code').toUpperCase();
}

export function parseCoupon(p: Payload): CouponWrite {
  const code = parseCouponCode(p);
  if (!/^[A-Z0-9_-]{2,32}$/.test(code)) {
    throw invalid('Coupon code must be 2-32 characters: letters, digits, "-" or "_" only.');
  }
  const discountType = p.discountType;
  if (discountType !== 'percent' && discountType !== 'fixed') {
    throw invalid('Discount type must be "percent" or "fixed".');
  }
  const value = money(p.value, 'Discount value');
  if (discountType === 'percent' && value > 100) {
    throw invalid('A percent discount cannot be more than 100.');
  }

  const startsAt = optionalTimestamp(p.startsAt, 'Start date');
  const expiresAt = optionalTimestamp(p.expiresAt, 'Expiry date');
  if (startsAt && expiresAt && Date.parse(expiresAt) <= Date.parse(startsAt)) {
    throw invalid('Expiry date must be after the start date.');
  }

  let usageLimit: number | null | undefined;
  if (p.usageLimit === undefined) usageLimit = undefined;
  else if (p.usageLimit === null) usageLimit = null;
  else usageLimit = wholeNumber(p.usageLimit, 'Usage limit');

  return {
    code,
    label: requiredString(p, 'label', 'Coupon label', 200),
    discountType,
    value,
    maxDiscount: optionalMoney(p.maxDiscount, 'Maximum discount'),
    minSubtotal: p.minSubtotal === undefined ? 0 : money(p.minSubtotal, 'Minimum subtotal'),
    active: p.active === undefined ? true : bool(p.active, 'Active'),
    startsAt,
    expiresAt,
    usageLimit,
  };
}

/** A non-empty list of distinct ids (bulk actions), at most `max`. */
export function parseIdList(p: Payload, key = 'ids', label = 'ids', max = 200): string[] {
  const value = p[key];
  if (!Array.isArray(value) || value.length === 0) throw invalid(`${label} must be a non-empty list.`);
  if (value.length > max) throw invalid(`At most ${max} items can be changed at once.`);
  if (value.some((v) => typeof v !== 'string' || !v.trim() || v.length > 200)) {
    throw invalid(`${label} must be a list of ids.`);
  }
  return [...new Set((value as string[]).map((v) => v.trim()))];
}

export function parseBulkActive(p: Payload): { ids: string[]; active: boolean } {
  return { ids: parseIdList(p, 'ids', 'Product ids'), active: bool(p.active, 'active') };
}

export function parseBulkOrderStatus(p: Payload): { ids: string[]; status: OrderStatus } {
  const ids = parseIdList(p, 'ids', 'Order ids', 100);
  const status = p.status;
  if (typeof status !== 'string' || !ORDER_STATUSES.includes(status as OrderStatus)) {
    throw invalid(`Status must be one of: ${ORDER_STATUSES.join(', ')}.`);
  }
  return { ids, status: status as OrderStatus };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseReviewId(p: Payload): string {
  const id = parseId(p, 'id', 'Review id');
  if (!UUID_RE.test(id)) throw invalid('Review id is not valid.');
  return id;
}

export function parseMessageRead(p: Payload): { id: string; read: boolean } {
  const id = parseId(p, 'id', 'Message id');
  if (!UUID_RE.test(id)) throw invalid('Message id is not valid.');
  return { id, read: bool(p.read, 'read') };
}

export function parseReviewModeration(p: Payload): { id: string; approved: boolean } {
  return { id: parseReviewId(p), approved: bool(p.approved, 'approved') };
}

export function parseBulkCategory(p: Payload): { ids: string[]; category: string } {
  return { ids: parseIdList(p, 'ids', 'Product ids'), category: requiredString(p, 'category', 'Category', 200) };
}

export function parseDeliverySettings(p: Payload): DeliverySettings {
  return {
    dhakaFee: money(p.dhakaFee, 'Dhaka delivery fee'),
    dhakaFreeFrom: optionalMoney(p.dhakaFreeFrom, 'Free delivery in Dhaka from'),
    outsideFee: money(p.outsideFee, 'Outside-Dhaka delivery fee'),
    outsideFreeFrom: optionalMoney(p.outsideFreeFrom, 'Free delivery outside Dhaka from'),
  };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function parseAddAdmin(p: Payload): { email: string; name: string | null } {
  const email = requiredString(p, 'email', 'Email', 200).toLowerCase();
  if (!EMAIL_RE.test(email)) throw invalid('Enter a valid email address.');
  return { email, name: optionalString(p, 'name', 'Name', 80) };
}

export function parseAdminRole(p: Payload): { userId: string; admin: boolean } {
  const userId = requiredString(p, 'userId', 'Account id', 64);
  if (!UUID_RE.test(userId)) throw invalid('Account id is not valid.');
  return { userId, admin: bool(p.admin, 'admin') };
}
