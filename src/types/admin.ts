import type { Category, Order, OrderStatus, PaymentMethod, PaymentStatus, Product } from './store';

// Shapes returned by the server-side admin read layer (src/lib/admin-queries.ts)
// and consumed by client components. Never include orders.access_token.

export type SortDir = 'asc' | 'desc';

export interface Paged<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
}

// ---- Orders ---------------------------------------------------------------

export type OrderSortKey = 'created_at' | 'total' | 'id' | 'customer_name' | 'status';

export interface OrderFilters {
  status: OrderStatus | 'all';
  q: string;
  method: PaymentMethod | 'all';
  pay: PaymentStatus[];
  refund: boolean;
  from: string; // day key or ''
  to: string;
  area: string;
  district: string;
  sort: OrderSortKey;
  dir: SortDir;
  page: number;
  pageSize: number;
}

export interface OrdersPage extends Paged<Order> {
  statusCounts: Record<OrderStatus | 'all', number>;
  areas: string[];
  /** Districts seen on orders (empty until the structured-address migration runs). */
  districts: string[];
  refundCount: number;
}

// ---- Overview -------------------------------------------------------------

export interface Kpi {
  value: number;
  previous: number;
}

export interface SeriesPoint {
  key: string; // day key or hour label
  label: string;
  revenue: number;
  orders: number;
}

export interface TopProduct {
  id: string;
  name: string;
  image: string;
  qty: number;
  revenue: number;
}

export interface TopCategory {
  id: string;
  name: string;
  revenue: number;
  qty: number;
}

export interface ActivityItem {
  id: string;
  kind: 'order' | 'status' | 'review' | 'message' | 'subscriber';
  title: string;
  detail?: string;
  at: string;
  href?: string;
}

export interface OverviewData {
  range: { preset: string; fromKey: string; toKey: string; label: string; days: number };
  kpis: {
    revenue: Kpi;
    orders: Kpi;
    aov: Kpi;
    newCustomers: Kpi;
    onlineShare: Kpi;
  };
  series: SeriesPoint[];
  granularity: 'hour' | 'day';
  statusBreakdown: { status: OrderStatus; count: number }[];
  paymentSplit: { method: PaymentMethod; orders: number; revenue: number }[];
  topProducts: TopProduct[];
  topCategories: TopCategory[];
  lowStock: Pick<Product, 'id' | 'name' | 'image' | 'stock' | 'unit' | 'category'>[];
  lowStockTotal: number;
  recentOrders: Order[];
  activity: ActivityItem[];
}

// ---- Products -------------------------------------------------------------

export type ProductSortKey = 'name' | 'price' | 'stock' | 'sold_count' | 'created_at' | 'updated_at';

export interface ProductFilters {
  q: string;
  category: string;
  stock: 'all' | 'low' | 'out' | 'in';
  status: 'all' | 'active' | 'hidden';
  featured: boolean;
  sort: ProductSortKey;
  dir: SortDir;
  page: number;
  pageSize: number;
}

export interface ProductsPage extends Paged<Product> {
  categories: Category[];
  /** Products per category including subcategories (for the tree picker). */
  categoryTotals: Record<string, number>;
  counts: { all: number; active: number; hidden: number; low: number; out: number };
}

// ---- Customers --------------------------------------------------------------

export type CustomerSortKey = 'name' | 'orders' | 'spent' | 'last_order';

export interface CustomerFilters {
  q: string;
  segment: 'all' | 'buyers' | 'no-orders' | 'repeat';
  sort: CustomerSortKey;
  dir: SortDir;
  page: number;
  pageSize: number;
}

export interface CustomerRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  area: string;
  city: string;
  joinedAt: string | null;
  ordersCount: number;
  totalSpent: number;
  lastOrderAt: string | null;
}

export interface CustomerReview {
  id: string;
  productId: string;
  productName: string;
  rating: number;
  comment: string;
  approved: boolean;
  createdAt: string;
}

export interface CustomerDetail {
  customer: CustomerRow & {
    address: string;
    /** Formatted "House…, Union, Upazila, District". */
    fullAddress: string;
    lastSignInAt: string | null;
    updatedAt: string | null;
  };
  orders: Order[];
  reviews: CustomerReview[];
  stats: { averageOrder: number; cancelled: number; delivered: number };
}

// ---- Reviews / messages / newsletter --------------------------------------

export interface ReviewRow {
  id: string;
  productId: string;
  productName: string;
  productImage: string;
  userId: string;
  authorName: string;
  rating: number;
  comment: string;
  verifiedPurchase: boolean;
  approved: boolean;
  createdAt: string;
}

export interface ReviewFilters {
  status: 'all' | 'approved' | 'hidden';
  rating: number[]; // 1-5
  q: string;
  page: number;
  pageSize: number;
}

export interface ReviewsPage extends Paged<ReviewRow> {
  counts: { all: number; approved: number; hidden: number };
  average: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  createdAt: string;
}

export interface Subscriber {
  email: string;
  createdAt: string;
}

// ---- Shell ----------------------------------------------------------------

export interface PulseOrder {
  id: string;
  name: string;
  total: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  createdAt: string;
}

export interface Pulse {
  pendingOrders: number;
  lowStock: number;
  hiddenReviews: number;
  messagesThisWeek: number;
  latestOrders: PulseOrder[];
  serverTime: string;
}

export interface SearchResults {
  orders: { id: string; name: string; phone: string; total: number; status: OrderStatus; createdAt: string }[];
  products: { id: string; name: string; image: string; price: number; stock: number; active: boolean }[];
  customers: { id: string; name: string; phone: string }[];
}

export interface AdminAccountRow {
  id: string;
  email: string;
  createdAt: string | null;
  lastSignInAt: string | null;
}
