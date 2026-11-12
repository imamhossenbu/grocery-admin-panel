import { connection, type NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { exportOrders } from '@/lib/admin-queries';
import { parseOrderFilters } from '@/lib/filters';
import { csvResponse, toCsv } from '@/lib/csv';
import { needsRefund } from '@/lib/order-meta';
import { todayKey } from '@/lib/dates';
import { apiError, paramsRecord } from '../../_shared';

/** CSV of every order matching the same filters as the Orders page. */
export async function GET(req: NextRequest) {
  await connection();
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  try {
    const orders = await exportOrders(parseOrderFilters(paramsRecord(req.url)));
    const csv = toCsv(
      [
        'Order ID', 'Placed at (UTC)', 'Status', 'Customer', 'Phone', 'Email', 'Address', 'Area', 'City',
        'Delivery slot', 'Items', 'Units', 'Subtotal', 'Discount', 'Coupon', 'Delivery fee', 'Total',
        'Payment method', 'Payment status', 'Paid at (UTC)', 'Transaction ID', 'Needs refund', 'Notes',
      ],
      orders.map((o) => [
        o.id, o.createdAt, o.status, o.customer.name, o.customer.phone, o.customer.email ?? '',
        o.customer.address, o.customer.area, o.customer.city, o.customer.deliverySlot,
        o.items.map((i) => `${i.qty} x ${i.name}`).join('; '),
        o.items.reduce((n, i) => n + i.qty, 0),
        o.subtotal, o.discount, o.couponCode ?? '', o.deliveryFee, o.total,
        o.paymentMethod, o.paymentStatus, o.paidAt ?? '', o.paymentTranId ?? '',
        needsRefund(o) ? 'yes' : '', o.customer.notes ?? '',
      ])
    );
    return csvResponse(`orders-${todayKey()}.csv`, csv);
  } catch (err) {
    return apiError(err, 'api/admin/orders/export');
  }
}
