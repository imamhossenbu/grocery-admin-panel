import React from 'react';
import { Banknote, CreditCard, RotateCcw } from 'lucide-react';
import type { Order, OrderStatus } from '@/types/store';
import { Badge } from '@/components/ui/Badge';
import { PAYMENT_STATUS_LABEL, PAYMENT_STATUS_TONE, STATUS_META, needsRefund } from '@/lib/order-meta';

export function StatusBadge({ status, size = 'sm' }: { status: OrderStatus; size?: 'sm' | 'md' }) {
  return (
    <Badge tone={STATUS_META[status].tone} dot size={size}>
      {status}
    </Badge>
  );
}

export function PaymentBadge({ order, compact = false }: { order: Pick<Order, 'paymentMethod' | 'paymentStatus' | 'status'>; compact?: boolean }) {
  const online = order.paymentMethod === 'sslcommerz';
  const Icon = online ? CreditCard : Banknote;
  const tone = online ? PAYMENT_STATUS_TONE[order.paymentStatus] : order.paymentStatus === 'paid' ? 'emerald' : 'gray';
  const text = online ? PAYMENT_STATUS_LABEL[order.paymentStatus] : order.paymentStatus === 'paid' ? 'COD · Paid' : order.paymentStatus === 'refunded' ? 'COD · Refunded' : 'Cash on delivery';
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <Badge tone={tone}>
        <Icon className="h-3.5 w-3.5" />
        {compact && online ? PAYMENT_STATUS_LABEL[order.paymentStatus] : text}
      </Badge>
      {needsRefund(order) && (
        <Badge tone="danger">
          <RotateCcw className="h-3.5 w-3.5" />
          Needs refund
        </Badge>
      )}
    </span>
  );
}
