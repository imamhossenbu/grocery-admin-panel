'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { createColumnHelper } from '@tanstack/react-table';
import { ArrowLeft, CalendarDays, Mail, MapPin, Phone, ShoppingBag, Star } from 'lucide-react';
import type { Order } from '@/types/store';
import type { CustomerDetail } from '@/types/admin';
import { cn } from '@/lib/cn';
import { formatBDT, formatNumber } from '@/lib/format';
import { formatDate, formatDateTime, formatRelative } from '@/lib/dates';
import { itemCount } from '@/lib/order-meta';
import { Avatar, Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { DataTable } from '@/components/ui/DataTable';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState } from '@/components/ui/EmptyState';
import { CountUp } from '@/components/ui/CountUp';
import { riseChild, staggerParent } from '@/components/ui/motion';
import { PaymentBadge, StatusBadge } from '@/components/orders/OrderBadges';

const col = createColumnHelper<Order>();
const ORDERS_PAGE = 10;
const REVIEWS_PAGE = 5;

function Stars({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${n} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={cn('h-4 w-4', i <= n ? 'fill-[#e0a21a] text-[#e0a21a]' : 'text-[#cfdcd4]')} />
      ))}
    </span>
  );
}

export function CustomerDetailView({ data }: { data: CustomerDetail }) {
  const { customer: c, orders, reviews, stats } = data;
  const [orderPage, setOrderPage] = useState(1);
  const [reviewPage, setReviewPage] = useState(1);

  const columns = useMemo(
    () => [
      col.accessor('id', {
        header: 'Order',
        meta: { alwaysVisible: true },
        cell: ({ row }) => (
          <div>
            <Link href={`/orders/${encodeURIComponent(row.original.id)}`} className="tabular font-semibold text-ink hover:text-primary">
              {row.original.id}
            </Link>
            <p className="text-[13px] text-muted">{itemCount(row.original)} items</p>
          </div>
        ),
      }),
      col.accessor('createdAt', {
        header: 'Placed',
        meta: { label: 'Placed' },
        cell: ({ getValue }) => <span className="tabular whitespace-nowrap text-muted">{formatDateTime(getValue())}</span>,
      }),
      col.display({ id: 'payment', header: 'Payment', meta: { label: 'Payment' }, cell: ({ row }) => <PaymentBadge order={row.original} compact /> }),
      col.accessor('status', { header: 'Status', meta: { label: 'Status' }, cell: ({ getValue }) => <StatusBadge status={getValue()} /> }),
      col.accessor('total', {
        header: 'Total',
        meta: { label: 'Total', align: 'right' },
        cell: ({ getValue }) => <span className="tabular font-semibold text-ink">{formatBDT(getValue())}</span>,
      }),
    ],
    []
  );

  const pagedOrders = orders.slice((orderPage - 1) * ORDERS_PAGE, orderPage * ORDERS_PAGE);
  const pagedReviews = reviews.slice((reviewPage - 1) * REVIEWS_PAGE, reviewPage * REVIEWS_PAGE);

  return (
    <div>
      <Link href="/customers" className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted transition hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> All customers
      </Link>
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <Avatar name={c.name} className="h-14 w-14 text-base" />
        <div className="min-w-0 flex-1">
          <h1 className="font-display truncate text-[28px] font-semibold leading-tight text-ink">{c.name}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
            {c.email && (
              <a href={`mailto:${c.email}`} className="inline-flex items-center gap-1.5 hover:text-primary">
                <Mail className="h-4 w-4" /> {c.email}
              </a>
            )}
            {c.phone && (
              <a href={`tel:${c.phone}`} className="tabular inline-flex items-center gap-1.5 hover:text-primary">
                <Phone className="h-4 w-4" /> {c.phone}
              </a>
            )}
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4" /> Joined {formatDate(c.joinedAt)}
            </span>
          </p>
        </div>
        <Badge tone="gray" size="md">
          Read only
        </Badge>
      </div>

      <motion.div variants={staggerParent} initial="initial" animate="animate" className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'Orders', value: c.ordersCount, fmt: formatNumber },
          { label: 'Total spent', value: c.totalSpent, fmt: formatBDT },
          { label: 'Average order', value: stats.averageOrder, fmt: formatBDT },
          { label: 'Delivered / cancelled', value: stats.delivered, fmt: (n: number) => `${formatNumber(n)} / ${stats.cancelled}` },
        ].map((k) => (
          <motion.div key={k.label} variants={riseChild} className="rounded-2xl border border-line bg-white p-5 shadow-soft">
            <p className="text-[13px] font-medium text-muted">{k.label}</p>
            <p className="font-display tabular mt-1 text-2xl font-semibold text-ink">
              <CountUp value={k.value} format={k.fmt} />
            </p>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <DataTable
            tableId="customer-orders"
            caption={`Orders by ${c.name}`}
            data={pagedOrders}
            columns={columns}
            getRowId={(o) => o.id}
            rowHref={(o) => `/orders/${encodeURIComponent(o.id)}`}
            toolbar={<h2 className="text-base font-semibold text-ink">Orders</h2>}
            empty={<EmptyState compact icon={<ShoppingBag className="h-6 w-6" />} title="No orders yet" description="This customer hasn’t placed an order." />}
            footer={
              orders.length > ORDERS_PAGE ? (
                <Pagination className="border-t border-line" page={orderPage} pageSize={ORDERS_PAGE} total={orders.length} onPageChange={setOrderPage} noun="orders" />
              ) : undefined
            }
          />

          <Card>
            <CardHeader title="Reviews" description={`${reviews.length} written`} icon={<Star className="h-[18px] w-[18px]" />} />
            {reviews.length ? (
              <>
                <ul className="divide-y divide-[#edf4ef] px-5 pt-2">
                  {pagedReviews.map((r) => (
                    <li key={r.id} className="py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Stars n={r.rating} />
                        <Link href={`/products/${encodeURIComponent(r.productId)}`} className="text-sm font-semibold text-ink hover:text-primary">
                          {r.productName}
                        </Link>
                        {!r.approved && <Badge tone="gray">Hidden</Badge>}
                        <span className="ml-auto text-[13px] text-muted">{formatRelative(r.createdAt)}</span>
                      </div>
                      {r.comment && <p className="mt-2 max-w-[75ch] text-sm leading-relaxed text-ink-2">{r.comment}</p>}
                    </li>
                  ))}
                </ul>
                {reviews.length > REVIEWS_PAGE && (
                  <Pagination className="border-t border-line" page={reviewPage} pageSize={REVIEWS_PAGE} total={reviews.length} onPageChange={setReviewPage} noun="reviews" />
                )}
              </>
            ) : (
              <EmptyState compact icon={<Star className="h-6 w-6" />} title="No reviews" description="Reviews this customer writes show up here." />
            )}
          </Card>
        </div>

        <Card className="self-start">
          <CardHeader title="Profile" icon={<MapPin className="h-[18px] w-[18px]" />} />
          <dl className="space-y-3 px-5 pb-5 pt-4 text-sm">
            <div>
              <dt className="text-[13px] text-muted">Address</dt>
              <dd className="leading-relaxed text-ink">{c.fullAddress || 'Not provided'}</dd>
            </div>
            <div>
              <dt className="text-[13px] text-muted">Last order</dt>
              <dd className="text-ink">{c.lastOrderAt ? `${formatDateTime(c.lastOrderAt)} (${formatRelative(c.lastOrderAt)})` : 'Never'}</dd>
            </div>
            <div>
              <dt className="text-[13px] text-muted">Last sign-in</dt>
              <dd className="text-ink">{formatDateTime(c.lastSignInAt)}</dd>
            </div>
            <div>
              <dt className="text-[13px] text-muted">Profile updated</dt>
              <dd className="text-ink">{formatDateTime(c.updatedAt)}</dd>
            </div>
          </dl>
        </Card>
      </div>
    </div>
  );
}
