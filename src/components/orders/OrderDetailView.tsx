'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import {
  AlertTriangle,
  ArrowLeft,
  Banknote,
  Check,
  Clock,
  Copy,
  CreditCard,
  Mail,
  MapPin,
  NotebookPen,
  Phone,
  Printer,
  RotateCcw,
  Trash2,
  Truck,
  UserRound,
} from 'lucide-react';
import { ORDER_STATUSES, type Order, type OrderStatus } from '@/types/store';
import { cn } from '@/lib/cn';
import { formatBDT } from '@/lib/format';
import { formatDateTime } from '@/lib/dates';
import { formatAddress } from '@/lib/address';
import { PAYMENT_METHOD_LABEL, PAYMENT_STATUS_LABEL, STATUS_META, itemCount, needsRefund, nextStatus } from '@/lib/order-meta';
import { useStoreAction } from '@/lib/client/store-action';
import { Card, CardHeader, Thumb } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Tooltip } from '@/components/ui/Tooltip';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { riseChild, staggerParent } from '@/components/ui/motion';
import { PaymentBadge, StatusBadge } from './OrderBadges';
import { RelativeTime } from '@/components/ui/RelativeTime';

function Row({ label, children, strong = false }: { label: React.ReactNode; children: React.ReactNode; strong?: boolean }) {
  return (
    <div className={cn('flex items-baseline justify-between gap-4 text-sm', strong ? 'text-[15px] font-semibold text-ink' : 'text-muted')}>
      <span>{label}</span>
      <span className={cn('tabular', strong ? 'text-ink' : 'text-ink')}>{children}</span>
    </div>
  );
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const toast = useToast();
  const [done, setDone] = useState(false);
  return (
    <Tooltip content={done ? 'Copied' : `Copy ${label}`}>
      <button
        type="button"
        aria-label={`Copy ${label}`}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text);
            setDone(true);
            window.setTimeout(() => setDone(false), 1500);
          } catch {
            toast.error('Could not copy', 'Your browser blocked clipboard access.');
          }
        }}
        className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-muted transition hover:bg-mint hover:text-primary active:scale-90"
      >
        {done ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
      </button>
    </Tooltip>
  );
}

function Invoice({ order, address }: { order: Order; address: string }) {
  return (
    <div className="hidden text-[12pt] text-black print:block">
      <div className="flex items-start justify-between border-b border-black/20 pb-4">
        <div>
          <p className="font-display text-2xl font-semibold">FreshBasket</p>
          <p className="text-sm">Tax invoice / delivery slip</p>
        </div>
        <div className="text-right text-sm">
          <p className="text-lg font-semibold">{order.id}</p>
          <p>{formatDateTime(order.createdAt)}</p>
          <p>
            {PAYMENT_METHOD_LABEL[order.paymentMethod]} · {PAYMENT_STATUS_LABEL[order.paymentStatus]}
          </p>
        </div>
      </div>
      <div className="mt-4 text-sm">
        <p className="font-semibold">Deliver to</p>
        <p>{order.customer.name}</p>
        <p>{order.customer.phone}</p>
        <p>{address}</p>
        <p>Slot: {order.customer.deliverySlot}</p>
      </div>
      <table className="mt-6 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-black/30 text-left">
            <th className="py-2">Item</th>
            <th className="py-2 text-right">Qty</th>
            <th className="py-2 text-right">Price</th>
            <th className="py-2 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((i) => (
            <tr key={i.productId} className="border-b border-black/10">
              <td className="py-2">
                {i.name} <span className="text-black/60">({i.unit})</span>
              </td>
              <td className="py-2 text-right">{i.qty}</td>
              <td className="py-2 text-right">{formatBDT(i.price)}</td>
              <td className="py-2 text-right">{formatBDT(i.price * i.qty)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="ml-auto mt-4 w-64 space-y-1 text-sm">
        <div className="flex justify-between"><span>Subtotal</span><span>{formatBDT(order.subtotal)}</span></div>
        {order.discount > 0 && <div className="flex justify-between"><span>Discount {order.couponCode ? `(${order.couponCode})` : ''}</span><span>−{formatBDT(order.discount)}</span></div>}
        <div className="flex justify-between"><span>Delivery</span><span>{order.deliveryFee ? formatBDT(order.deliveryFee) : 'Free'}</span></div>
        <div className="flex justify-between border-t border-black/30 pt-1 text-base font-semibold"><span>Total</span><span>{formatBDT(order.total)}</span></div>
      </div>
      <p className="mt-10 text-center text-xs text-black/60">Thank you for shopping with FreshBasket.</p>
    </div>
  );
}

export function OrderDetailView({
  order,
  customerOrders,
  customerName,
  autoPrint = false,
}: {
  order: Order;
  customerOrders: number;
  customerName: string | null;
  autoPrint?: boolean;
}) {
  const router = useRouter();
  const { run, busy } = useStoreAction();
  const confirm = useConfirm();
  const [draftStatus, setDraftStatus] = useState<OrderStatus>(order.status);
  const [synced, setSynced] = useState(order.status);
  if (synced !== order.status) {
    setSynced(order.status);
    setDraftStatus(order.status);
  }
  const next = nextStatus(order.status);
  const refund = needsRefund(order);
  const c = order.customer;
  const address = formatAddress({
    address: c.address,
    union: c.union,
    upazila: c.upazila,
    district: c.district,
    area: c.area,
    city: c.city,
  });
  const history = [...(order.statusHistory ?? [])].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));

  useEffect(() => {
    if (!autoPrint) return;
    const t = window.setTimeout(() => window.print(), 400);
    return () => window.clearTimeout(t);
  }, [autoPrint]);

  const applyStatus = async (status: OrderStatus) => {
    if (status === order.status) return;
    const ok = await confirm({
      title: `Mark ${order.id} as ${status}?`,
      description:
        status === 'Cancelled'
          ? `The ${itemCount(order)} items go back into stock.${order.paymentStatus === 'paid' ? ' This order was paid online: refund the customer afterwards.' : ''}`
          : order.status === 'Cancelled'
            ? 'Re-opening a cancelled order takes its items out of stock again.'
            : 'The change is added to the order’s status history.',
      confirmLabel: `Mark ${status}`,
      tone: status === 'Cancelled' ? 'danger' : 'default',
    });
    if (!ok) {
      setDraftStatus(order.status);
      return;
    }
    const out = await run('UPDATE_ORDER_STATUS', { id: order.id, status }, { success: `Order marked ${status}` });
    if (!out.ok) setDraftStatus(order.status);
  };

  const markRefunded = async () => {
    const ok = await confirm({
      title: 'Mark this payment as refunded?',
      description: `Only do this after you have returned ${formatBDT(order.total)} to the customer in the SSLCommerz merchant panel.`,
      confirmLabel: 'Mark refunded',
    });
    if (ok) await run('MARK_ORDER_REFUNDED', { id: order.id }, { success: 'Payment marked as refunded' });
  };

  const remove = async () => {
    const ok = await confirm({
      title: `Delete order ${order.id}?`,
      description: 'The order record is removed permanently. Stock is not changed — cancel the order first if its items should go back on the shelf.',
      confirmLabel: 'Delete order',
      tone: 'danger',
    });
    if (!ok) return;
    const out = await run('DELETE_ORDER', { id: order.id }, { success: `Order ${order.id} deleted` }, { refresh: false });
    if (out.ok) router.replace('/orders');
  };

  return (
    <>
      <Invoice order={order} address={address} />
      <div className="print:hidden">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <Link href="/orders" className="mb-2 inline-flex items-center gap-1.5 rounded-lg text-[13px] font-semibold text-muted transition hover:text-primary">
              <ArrowLeft className="h-4 w-4" /> All orders
            </Link>
            <h1 className="font-display tabular text-[28px] font-semibold leading-tight text-ink">{order.id}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[13px] text-muted">
              <StatusBadge status={order.status} size="md" />
              <PaymentBadge order={order} />
              <span>
                Placed {formatDateTime(order.createdAt)} · {<RelativeTime value={order.createdAt} />}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> Print invoice
            </Button>
            <Select
              className="w-48"
              value={draftStatus}
              onChange={(v) => {
                setDraftStatus(v);
                applyStatus(v);
              }}
              searchable={false}
              disabled={busy}
              aria-label="Order status"
              options={ORDER_STATUSES.map((s) => ({
                value: s,
                label: s,
                icon: <span className="block h-2.5 w-2.5 rounded-full" style={{ background: STATUS_META[s].color }} />,
              }))}
            />
            {next && (
              <Button variant="primary" onClick={() => applyStatus(next)} loading={busy}>
                <Truck className="h-4 w-4" /> Mark {next}
              </Button>
            )}
          </div>
        </div>

        {refund && (
          <div role="alert" className="fb-slide-down mb-6 flex flex-wrap items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-900">
            <RotateCcw className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold">Needs refund</p>
              <p className="text-sm">
                This order was paid online ({formatBDT(order.total)}) but is cancelled. Refund the customer in the SSLCommerz panel
                {order.paymentTranId ? ` (transaction ${order.paymentTranId})` : ''}, or re-open the order.
              </p>
            </div>
            <Button variant="danger" size="sm" onClick={markRefunded} disabled={busy}>
              Mark as refunded
            </Button>
          </div>
        )}

        <motion.div variants={staggerParent} initial="initial" animate="animate" className="grid grid-cols-1 gap-6 xl:grid-cols-3 [&>*]:min-w-0">
          <div className="space-y-6 xl:col-span-2">
            <motion.div variants={riseChild}>
              <Card>
                <CardHeader title="Items" description={`${itemCount(order)} units · ${order.items.length} products`} />
                <ul className="divide-y divide-[#edf4ef] px-5 pt-2">
                  {order.items.map((i) => (
                    <li key={i.productId} className="flex min-h-16 items-center gap-3 py-2">
                      <Thumb src={i.image} className="h-12 w-12" />
                      <div className="min-w-0 flex-1">
                        <Link href={`/products/${encodeURIComponent(i.productId)}`} className="block truncate text-sm font-medium text-ink hover:text-primary">
                          {i.name}
                        </Link>
                        <p className="tabular text-[13px] text-muted">
                          {i.unit} · {i.qty} × {formatBDT(i.price)}
                        </p>
                      </div>
                      <span className="tabular text-sm font-semibold text-ink">{formatBDT(i.price * i.qty)}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-2 space-y-2 border-t border-line px-5 py-4">
                  <Row label="Subtotal">{formatBDT(order.subtotal)}</Row>
                  {order.discount > 0 && (
                    <Row label={<>Discount{order.couponCode && <span className="ml-1.5 rounded-md bg-mint px-1.5 py-0.5 text-xs font-semibold text-primary-600">{order.couponCode}</span>}</>}>
                      −{formatBDT(order.discount)}
                    </Row>
                  )}
                  <Row label="Delivery">{order.deliveryFee ? formatBDT(order.deliveryFee) : 'Free'}</Row>
                  <div className="border-t border-dashed border-line-strong pt-2">
                    <Row label="Total" strong>
                      {formatBDT(order.total)}
                    </Row>
                  </div>
                </div>
              </Card>
            </motion.div>

            <motion.div variants={riseChild}>
              <Card>
                <CardHeader title="Status history" description="Every change, oldest first" icon={<Clock className="h-[18px] w-[18px]" />} />
                {history.length ? (
                  <ol className="relative px-5 pb-6 pt-5">
                    {history.map((e, i) => {
                      const meta = STATUS_META[e.status] ?? STATUS_META.Pending;
                      const last = i === history.length - 1;
                      return (
                        <li key={`${e.status}-${e.at}-${i}`} className="relative flex gap-4 pb-5 last:pb-0">
                          {!last && <span aria-hidden className="absolute left-[15px] top-8 h-[calc(100%-24px)] w-0.5 rounded bg-[#e3ece6]" />}
                          <span
                            className={cn('relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full ring-4 ring-white', last ? 'text-white' : 'bg-white')}
                            style={last ? { background: meta.color } : { boxShadow: `inset 0 0 0 2px ${meta.color}` }}
                          >
                            {last ? <Check className="h-4 w-4" /> : <span className="h-2 w-2 rounded-full" style={{ background: meta.color }} />}
                          </span>
                          <div className="pt-1">
                            <p className="text-sm font-semibold text-ink">{e.status}</p>
                            <p className="tabular text-[13px] text-muted">
                              {formatDateTime(e.at)} · {<RelativeTime value={e.at} />}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                ) : (
                  <p className="px-5 pb-5 pt-3 text-sm text-muted">No history recorded for this order.</p>
                )}
              </Card>
            </motion.div>
          </div>

          <div className="space-y-6">
            <motion.div variants={riseChild}>
              <Card>
                <CardHeader title="Customer" icon={<UserRound className="h-[18px] w-[18px]" />} />
                <div className="space-y-3 px-5 pb-5 pt-4 text-sm">
                  <div>
                    <p className="text-[15px] font-semibold text-ink">{c.name}</p>
                    <p className="text-[13px] text-muted">
                      {customerOrders === 1 ? 'First order' : `${customerOrders} orders in total`}
                      {order.userId ? ' · registered account' : ' · guest checkout'}
                    </p>
                  </div>
                  <p className="flex items-center gap-2 text-ink">
                    <Phone className="h-4 w-4 shrink-0 text-muted" />
                    <a href={`tel:${c.phone}`} className="tabular hover:text-primary">
                      {c.phone}
                    </a>
                    <CopyButton text={c.phone} label="phone number" />
                  </p>
                  {c.email && (
                    <p className="flex items-center gap-2 text-ink">
                      <Mail className="h-4 w-4 shrink-0 text-muted" />
                      <a href={`mailto:${c.email}`} className="truncate hover:text-primary">
                        {c.email}
                      </a>
                    </p>
                  )}
                  <p className="flex items-start gap-2 text-ink">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
                    <span className="flex-1 leading-relaxed">{address}</span>
                    <CopyButton text={address} label="address" />
                  </p>
                  <p className="flex items-center gap-2 text-ink">
                    <Clock className="h-4 w-4 shrink-0 text-muted" />
                    {c.deliverySlot}
                  </p>
                  {c.notes && (
                    <p className="flex items-start gap-2 rounded-xl bg-[#fffaeb] p-3 text-[#5c3d05]">
                      <NotebookPen className="mt-0.5 h-4 w-4 shrink-0" />
                      <span className="leading-relaxed">{c.notes}</span>
                    </p>
                  )}
                  {order.userId && (
                    <Link href={`/customers/${order.userId}`} className="inline-flex items-center gap-1.5 rounded-lg text-[13px] font-semibold text-primary-600 hover:underline">
                      View {customerName ?? 'customer'}’s profile →
                    </Link>
                  )}
                </div>
              </Card>
            </motion.div>

            <motion.div variants={riseChild}>
              <Card>
                <CardHeader
                  title="Payment"
                  icon={order.paymentMethod === 'cod' ? <Banknote className="h-[18px] w-[18px]" /> : <CreditCard className="h-[18px] w-[18px]" />}
                />
                <div className="space-y-2.5 px-5 pb-5 pt-4">
                  <Row label="Method">{PAYMENT_METHOD_LABEL[order.paymentMethod]}</Row>
                  <Row label="Status">{PAYMENT_STATUS_LABEL[order.paymentStatus]}</Row>
                  {order.paidAt && <Row label="Paid at">{formatDateTime(order.paidAt)}</Row>}
                  <Row label="Amount">{formatBDT(order.total)}</Row>
                  {order.paymentTranId && (
                    <div className="flex items-center justify-between gap-2 text-sm text-muted">
                      <span>Transaction</span>
                      <span className="flex min-w-0 items-center gap-1">
                        <span className="tabular truncate text-ink">{order.paymentTranId}</span>
                        <CopyButton text={order.paymentTranId} label="transaction ID" />
                      </span>
                    </div>
                  )}
                  {order.paymentMethod === 'sslcommerz' && order.paymentStatus === 'pending' && (
                    <p className="flex items-start gap-2 rounded-xl bg-[#fffaeb] p-3 text-[13px] text-[#5c3d05]">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      Waiting for the gateway. Unpaid online orders are cancelled automatically after an hour.
                    </p>
                  )}
                </div>
              </Card>
            </motion.div>

            <motion.div variants={riseChild}>
              <Card className="border-red-100">
                <CardHeader title="Danger zone" description="Permanent actions" />
                <div className="px-5 pb-5 pt-4">
                  <Button variant="danger-soft" size="sm" onClick={remove} disabled={busy}>
                    <Trash2 className="h-4 w-4" /> Delete order record
                  </Button>
                </div>
              </Card>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </>
  );
}
