import 'server-only';

import { ORDER_STATUSES, type OrderStatus } from '@/types/store';
import {
  StoreError,
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

export function parseCategory(p: Payload): CategoryWrite {
  const id = requiredString(p, 'id', 'Category id', 100);
  if (/\s/.test(id)) throw invalid('Category id cannot contain spaces.');
  return {
    id,
    name: requiredString(p, 'name', 'Category name', 200),
    blurb: optionalString(p, 'blurb', 'Blurb', 500) ?? '',
    image: optionalString(p, 'image', 'Image URL', 2000) ?? '',
  };
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
