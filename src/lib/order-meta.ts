import type { Order, OrderStatus, PaymentMethod, PaymentStatus } from '@/types/store';

// Shared (client + server) presentation rules for orders.

/**
 * Categorical colours for order status, validated as a ring (donut) for
 * colour-vision deficiency separation. Charts always show them with labels.
 */
export const STATUS_META: Record<
  OrderStatus,
  { color: string; tone: 'amber' | 'sky' | 'teal' | 'violet' | 'emerald' | 'rose'; short: string }
> = {
  Pending: { color: '#c98a0c', tone: 'amber', short: 'Pending' },
  Confirmed: { color: '#3a74d6', tone: 'sky', short: 'Confirmed' },
  Packed: { color: '#16a3a0', tone: 'teal', short: 'Packed' },
  'Out for delivery': { color: '#b14bc4', tone: 'violet', short: 'On the way' },
  Delivered: { color: '#1a663b', tone: 'emerald', short: 'Delivered' },
  Cancelled: { color: '#e0577a', tone: 'rose', short: 'Cancelled' },
};

/** Next step in the normal fulfilment flow (null at the end). */
export function nextStatus(status: OrderStatus): OrderStatus | null {
  const flow: OrderStatus[] = ['Pending', 'Confirmed', 'Packed', 'Out for delivery', 'Delivered'];
  const i = flow.indexOf(status);
  return i >= 0 && i < flow.length - 1 ? flow[i + 1] : null;
}

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  cod: 'Cash on delivery',
  sslcommerz: 'Online (SSLCommerz)',
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  unpaid: 'Unpaid',
  pending: 'Awaiting payment',
  paid: 'Paid',
  failed: 'Payment failed',
  cancelled: 'Payment cancelled',
  refunded: 'Refunded',
};

export const PAYMENT_STATUS_TONE: Record<
  PaymentStatus,
  'gray' | 'amber' | 'emerald' | 'rose' | 'sky'
> = {
  unpaid: 'gray',
  pending: 'amber',
  paid: 'emerald',
  failed: 'rose',
  cancelled: 'rose',
  refunded: 'sky',
};

type OrderPaymentFields = Pick<Order, 'paymentMethod' | 'paymentStatus' | 'status'>;

/** Paid online but the order is cancelled: the money must be refunded (or the order re-opened). */
export function needsRefund(o: OrderPaymentFields): boolean {
  return o.paymentMethod === 'sslcommerz' && o.paymentStatus === 'paid' && o.status === 'Cancelled';
}

export function paymentLabel(method: PaymentMethod, status: PaymentStatus): string {
  if (method === 'cod') {
    return status === 'paid' ? 'COD · Paid' : status === 'refunded' ? 'COD · Refunded' : 'Cash on delivery';
  }
  return `Online · ${PAYMENT_STATUS_LABEL[status]}`;
}

export function itemCount(o: Pick<Order, 'items'>): number {
  return o.items.reduce((n, i) => n + i.qty, 0);
}
