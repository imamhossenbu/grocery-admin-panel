export interface Category {
  id: string;
  name: string;
  blurb: string;
  image: string;
  iconName?: string;
  /** Parent category id; null/undefined = top level. At most 3 levels deep. */
  parentId?: string | null;
  /** Longer text shown on the storefront category page. */
  description?: string;
  /** Position among its siblings (ascending). Written by REORDER_CATEGORIES. */
  sortOrder?: number;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  unit: string;
  price: number;
  oldPrice?: number;
  description: string;
  image: string;
  /** Extra gallery images (the main one stays in `image`). */
  images?: string[];
  badge?: string;
  rating: number;
  /** Maintained by the database from approved reviews. Read-only here. */
  reviewCount?: number;
  sku: string;
  stock: number;
  /** Maintained by the database when orders are placed/cancelled. Read-only here. */
  soldCount?: number;
  featured: boolean;
  active: boolean;
  origin?: string;
  nutrition?: string;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Coupon {
  code: string;
  label: string;
  discountType: 'percent' | 'fixed';
  value: number;
  maxDiscount?: number;
  minSubtotal: number;
  active: boolean;
  /** ISO timestamps; null/undefined means "no limit". */
  startsAt?: string | null;
  expiresAt?: string | null;
  usageLimit?: number | null;
  /** Maintained by the database when orders are placed. Read-only here. */
  usedCount?: number;
}

export interface OrderItem {
  productId: string;
  name: string;
  unit: string;
  price: number;
  qty: number;
  image: string;
}

export type OrderStatus =
  | 'Pending'
  | 'Confirmed'
  | 'Packed'
  | 'Out for delivery'
  | 'Delivered'
  | 'Cancelled';

export const ORDER_STATUSES: readonly OrderStatus[] = [
  'Pending',
  'Confirmed',
  'Packed',
  'Out for delivery',
  'Delivered',
  'Cancelled',
];

export interface OrderStatusEvent {
  status: OrderStatus;
  at: string;
}

export type PaymentMethod = 'cod' | 'sslcommerz';
export type PaymentStatus = 'unpaid' | 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded';
export const PAYMENT_STATUSES: readonly PaymentStatus[] = ['unpaid', 'pending', 'paid', 'failed', 'cancelled', 'refunded'];

export interface Order {
  id: string;
  createdAt: string;
  customer: {
    name: string;
    phone: string;
    email?: string;
    address: string;
    area: string;
    city: string;
    deliverySlot: string;
    notes?: string;
    /** Structured Bangladesh address (newer orders only). */
    division?: string;
    district?: string;
    upazila?: string;
    union?: string;
  };
  items: OrderItem[];
  subtotal: number;
  discount: number;
  couponCode?: string;
  deliveryFee: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paidAt?: string;
  /** SSLCommerz transaction id (online orders only) — use it to find the payment in the merchant panel. */
  paymentTranId?: string;
  status: OrderStatus;
  statusHistory?: OrderStatusEvent[];
  userId?: string | null;
  updatedAt?: string;
}

export interface StoreDatabase {
  categories: Category[];
  products: Product[];
  coupons: Coupon[];
  orders: Order[];
  updatedAt: string;
}

