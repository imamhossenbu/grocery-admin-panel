import { ORDER_STATUSES, PAYMENT_STATUSES, type OrderStatus, type PaymentStatus } from '@/types/store';
import type {
  CustomerFilters,
  CustomerSortKey,
  OrderFilters,
  OrderSortKey,
  ProductFilters,
  ProductSortKey,
  ReviewFilters,
  SortDir,
} from '@/types/admin';
import { DEFAULT_PAGE_SIZE, PAGE_SIZES } from './constants';
import { isDayKey } from './dates';

// URL search params -> typed, clamped filters. Shared by pages (server) and
// views (client), so the URL is the single source of truth for every list.

export type RawSearchParams = Record<string, string | string[] | undefined>;

export function one(sp: RawSearchParams, key: string): string {
  const v = sp[key];
  return (Array.isArray(v) ? v[0] : v ?? '').trim();
}

function list(sp: RawSearchParams, key: string): string[] {
  return one(sp, key)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function pick<T extends string>(value: string, allowed: readonly T[], fallback: T): T {
  return (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

function page(sp: RawSearchParams): number {
  const n = Number.parseInt(one(sp, 'page'), 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 10_000) : 1;
}

function pageSize(sp: RawSearchParams): number {
  const n = Number.parseInt(one(sp, 'size'), 10);
  return (PAGE_SIZES as readonly number[]).includes(n) ? n : DEFAULT_PAGE_SIZE;
}

function dir(sp: RawSearchParams, fallback: SortDir): SortDir {
  return pick(one(sp, 'dir'), ['asc', 'desc'] as const, fallback);
}

/** Free-text search, capped and stripped of characters that mean something to PostgREST filters. */
export function cleanSearch(value: string): string {
  return value
    .replace(/[%_*,()\\"'`:;]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
}

export function parseOrderFilters(sp: RawSearchParams): OrderFilters {
  const from = one(sp, 'from');
  const to = one(sp, 'to');
  return {
    status: pick(one(sp, 'status'), ['all', ...ORDER_STATUSES] as const, 'all') as OrderStatus | 'all',
    q: cleanSearch(one(sp, 'q')),
    method: pick(one(sp, 'method'), ['all', 'cod', 'sslcommerz'] as const, 'all'),
    pay: list(sp, 'pay').filter((p): p is PaymentStatus =>
      (PAYMENT_STATUSES as readonly string[]).includes(p)
    ),
    refund: one(sp, 'refund') === '1',
    from: isDayKey(from) ? from : '',
    to: isDayKey(to) ? to : '',
    area: one(sp, 'area').slice(0, 100),
    district: one(sp, 'district').slice(0, 100),
    sort: pick<OrderSortKey>(one(sp, 'sort'), ['created_at', 'total', 'id', 'customer_name', 'status'], 'created_at'),
    dir: dir(sp, 'desc'),
    page: page(sp),
    pageSize: pageSize(sp),
  };
}

export function parseProductFilters(sp: RawSearchParams): ProductFilters {
  return {
    q: cleanSearch(one(sp, 'q')),
    category: one(sp, 'category').slice(0, 100),
    stock: pick(one(sp, 'stock'), ['all', 'low', 'out', 'in'] as const, 'all'),
    status: pick(one(sp, 'status'), ['all', 'active', 'hidden'] as const, 'all'),
    featured: one(sp, 'featured') === '1',
    sort: pick<ProductSortKey>(
      one(sp, 'sort'),
      ['name', 'price', 'stock', 'sold_count', 'created_at', 'updated_at'],
      'created_at'
    ),
    dir: dir(sp, 'desc'),
    page: page(sp),
    pageSize: pageSize(sp),
  };
}

export function parseCustomerFilters(sp: RawSearchParams): CustomerFilters {
  return {
    q: cleanSearch(one(sp, 'q')),
    segment: pick(one(sp, 'segment'), ['all', 'buyers', 'no-orders', 'repeat'] as const, 'all'),
    sort: pick<CustomerSortKey>(one(sp, 'sort'), ['name', 'orders', 'spent', 'last_order'], 'last_order'),
    dir: dir(sp, 'desc'),
    page: page(sp),
    pageSize: pageSize(sp),
  };
}

export function parseReviewFilters(sp: RawSearchParams): ReviewFilters {
  return {
    status: pick(one(sp, 'status'), ['all', 'approved', 'hidden'] as const, 'all'),
    rating: list(sp, 'rating')
      .map(Number)
      .filter((n) => Number.isInteger(n) && n >= 1 && n <= 5),
    q: cleanSearch(one(sp, 'q')),
    page: page(sp),
    pageSize: pageSize(sp),
  };
}

export function parseSimpleList(sp: RawSearchParams): { q: string; page: number; pageSize: number } {
  return { q: cleanSearch(one(sp, 'q')), page: page(sp), pageSize: pageSize(sp) };
}
