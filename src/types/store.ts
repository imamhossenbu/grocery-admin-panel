export interface Category {
  id: string;
  name: string;
  blurb: string;
  image: string;
  iconName?: string;
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
  badge?: string;
  rating: number;
  sku: string;
  stock: number;
  featured: boolean;
  active: boolean;
  origin?: string;
  nutrition?: string;
  createdAt?: string;
}

export interface Coupon {
  code: string;
  label: string;
  discountType: 'percent' | 'fixed';
  value: number;
  maxDiscount?: number;
  minSubtotal: number;
  active: boolean;
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
  };
  items: OrderItem[];
  subtotal: number;
  discount: number;
  couponCode?: string;
  deliveryFee: number;
  total: number;
  paymentMethod: 'cod';
  status: OrderStatus;
}

export interface StoreDatabase {
  categories: Category[];
  products: Product[];
  coupons: Coupon[];
  orders: Order[];
  updatedAt: string;
}

