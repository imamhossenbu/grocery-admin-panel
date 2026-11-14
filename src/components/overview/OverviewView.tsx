'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import * as RT from '@radix-ui/react-tabs';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Banknote,
  CreditCard,
  Flame,
  FolderTree,
  Mail,
  MessageSquareText,
  PackageCheck,
  ShoppingBag,
  Star,
  TrendingDown,
  TrendingUp,
  UserPlus,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import type { ActivityItem, OverviewData } from '@/types/admin';
import { cn } from '@/lib/cn';
import { formatBDT, formatNumber, formatPercent } from '@/lib/format';
import { formatDayKey, formatRelative } from '@/lib/dates';
import { LOW_STOCK_THRESHOLD } from '@/lib/constants';
import { useUrlState } from '@/lib/client/use-url-state';
import { Card, CardHeader, Thumb } from '@/components/ui/Card';
import { CountUp } from '@/components/ui/CountUp';
import { TabsList } from '@/components/ui/Tabs';
import { DateRangePicker } from '@/components/ui/DatePicker';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { riseChild, staggerParent } from '@/components/ui/motion';
import { OverviewBodySkeleton } from '@/components/skeletons/OverviewSkeleton';
import { PaymentBadge, StatusBadge } from '@/components/orders/OrderBadges';
import { StatusDonut, TrendChart } from './Charts';

type Preset = 'today' | '7d' | '30d' | '90d' | 'custom';

function Delta({ value, previous, mode = 'pct', days }: { value: number; previous: number; mode?: 'pct' | 'pp'; days: number }) {
  let text: string;
  let up: boolean | null;
  if (mode === 'pp') {
    const diff = (value - previous) * 100;
    up = Math.abs(diff) < 0.5 ? null : diff > 0;
    text = `${diff > 0 ? '+' : ''}${diff.toFixed(1)} pts`;
  } else if (previous === 0) {
    up = value > 0 ? true : null;
    text = value > 0 ? 'New' : '0%';
  } else {
    const pct = (value - previous) / previous;
    up = Math.abs(pct) < 0.005 ? null : pct > 0;
    text = `${pct > 0 ? '+' : ''}${(pct * 100).toFixed(1)}%`;
  }
  const Icon = up === false ? TrendingDown : TrendingUp;
  return (
    <span className="flex min-w-0 items-center gap-2 whitespace-nowrap text-[13px]">
      <span
        className={cn(
          'tabular inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold',
          up === null ? 'bg-[#eef3f0] text-muted' : up ? 'bg-[#e3f5ea] text-[#145732]' : 'bg-red-50 text-red-700'
        )}
      >
        {up !== null && <Icon className="h-3.5 w-3.5" />}
        {text}
      </span>
      <span className="truncate text-muted">vs prev. {days === 1 ? 'day' : `${days} days`}</span>
    </span>
  );
}

function Kpi({
  label,
  icon: Icon,
  value,
  format,
  children,
  tone = 'mint',
}: {
  label: string;
  icon: LucideIcon;
  value: number;
  format: (n: number) => string;
  children: React.ReactNode;
  tone?: 'mint' | 'amber' | 'sky' | 'violet' | 'forest';
}) {
  const tones = {
    mint: 'bg-mint text-primary',
    amber: 'bg-[#fef5dc] text-[#9a6206]',
    sky: 'bg-[#ecf2fd] text-[#24539f]',
    violet: 'bg-[#f7ecfa] text-[#7d2d8c]',
    forest: 'bg-forest text-leaf',
  };
  return (
    <motion.div variants={riseChild} className="flex h-full min-h-[148px] flex-col rounded-2xl border border-line bg-white p-5 shadow-soft transition-shadow duration-200 hover:shadow-card">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] font-medium text-muted">{label}</p>
        <span className={cn('grid h-9 w-9 place-items-center rounded-xl', tones[tone])}>
          <Icon className="h-[18px] w-[18px]" />
        </span>
      </div>
      <p className="font-display tabular mt-2 truncate text-[28px] font-semibold leading-tight text-ink">
        <CountUp value={value} format={format} />
      </p>
      <div className="mt-auto pt-2">{children}</div>
    </motion.div>
  );
}

const ACTIVITY_ICON: Record<ActivityItem['kind'], { icon: LucideIcon; cls: string }> = {
  order: { icon: ShoppingBag, cls: 'bg-mint text-primary' },
  status: { icon: PackageCheck, cls: 'bg-[#ecf2fd] text-[#24539f]' },
  review: { icon: Star, cls: 'bg-[#fef5dc] text-[#9a6206]' },
  message: { icon: MessageSquareText, cls: 'bg-[#f7ecfa] text-[#7d2d8c]' },
  subscriber: { icon: Mail, cls: 'bg-[#e4f6f5] text-[#0d6a68]' },
};

const ACTIVITY_PAGE = 6;

export function OverviewView({ data }: { data: OverviewData }) {
  const { set, isPending } = useUrlState();
  const [metric, setMetric] = useState<'revenue' | 'orders'>('revenue');
  const [activityPage, setActivityPage] = useState(1);
  const preset = data.range.preset as Preset;
  const { kpis } = data;
  const days = data.range.days;

  const choose = (p: Preset, from?: string, to?: string) =>
    set(p === 'custom' ? { range: 'custom', from, to } : { range: p === '30d' ? null : p, from: null, to: null });

  const paymentTotal = data.paymentSplit.reduce((s, p) => s + p.orders, 0);
  const maxProduct = Math.max(1, ...data.topProducts.map((p) => p.revenue));
  const maxCategory = Math.max(1, ...data.topCategories.map((c) => c.revenue));
  const activity = data.activity.slice((activityPage - 1) * ACTIVITY_PAGE, activityPage * ACTIVITY_PAGE);

  return (
    <div className="space-y-6">
      {/* Range controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <RT.Root value={preset === 'custom' ? '' : preset} onValueChange={(v) => choose(v as Preset)}>
          <TabsList
            variant="pill"
            aria-label="Date range"
            value={preset}
            items={[
              { value: 'today', label: 'Today' },
              { value: '7d', label: '7 days' },
              { value: '30d', label: '30 days' },
              { value: '90d', label: '90 days' },
            ]}
          />
        </RT.Root>
        <div className="flex items-center gap-3">
          <p className="hidden text-[13px] text-muted md:block">
            {formatDayKey(data.range.fromKey, true)}
            {data.range.fromKey !== data.range.toKey && ` – ${formatDayKey(data.range.toKey, true)}`}
          </p>
          <DateRangePicker
            fit
            value={{ from: data.range.fromKey, to: data.range.toKey }}
            preset={preset === 'custom' ? null : preset}
            onChange={({ preset: p, range }) => (p ? choose(p as Preset) : choose('custom', range.from, range.to))}
            align="end"
            aria-label="Custom date range"
          />
        </div>
      </div>

      {isPending ? (
        <div className="space-y-6" aria-busy>
          <OverviewBodySkeleton />
        </div>
      ) : (
        <>
          <motion.div variants={staggerParent} initial="initial" animate="animate" className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
            <Kpi label="Revenue" icon={Wallet} value={kpis.revenue.value} format={formatBDT} tone="forest">
              <Delta value={kpis.revenue.value} previous={kpis.revenue.previous} days={days} />
            </Kpi>
            <Kpi label="Orders" icon={ShoppingBag} value={kpis.orders.value} format={formatNumber}>
              <Delta value={kpis.orders.value} previous={kpis.orders.previous} days={days} />
            </Kpi>
            <Kpi label="Average order value" icon={Banknote} value={kpis.aov.value} format={formatBDT} tone="amber">
              <Delta value={kpis.aov.value} previous={kpis.aov.previous} days={days} />
            </Kpi>
            <Kpi label="New customers" icon={UserPlus} value={kpis.newCustomers.value} format={formatNumber} tone="sky">
              <Delta value={kpis.newCustomers.value} previous={kpis.newCustomers.previous} days={days} />
            </Kpi>
            <Kpi label="Paid online" icon={CreditCard} value={kpis.onlineShare.value * 100} format={(n) => `${n.toFixed(1)}%`} tone="violet">
              <Delta value={kpis.onlineShare.value} previous={kpis.onlineShare.previous} mode="pp" days={days} />
            </Kpi>
          </motion.div>

          {/* Trend + status */}
          <div className="grid items-stretch gap-6 xl:grid-cols-3">
            <Card className="flex h-full flex-col xl:col-span-2">
              <CardHeader
                title={metric === 'revenue' ? 'Revenue' : 'Orders'}
                description={`${data.granularity === 'hour' ? 'By hour' : 'By day'} · cancelled orders excluded from revenue`}
                actions={
                  <RT.Root value={metric} onValueChange={(v) => setMetric(v as 'revenue' | 'orders')}>
                    <TabsList
                      variant="pill"
                      aria-label="Chart measure"
                      value={metric}
                      items={[
                        { value: 'revenue', label: 'Revenue' },
                        { value: 'orders', label: 'Orders' },
                      ]}
                    />
                  </RT.Root>
                }
              />
              <div className="h-[320px] px-3 pb-5 pt-6 sm:px-5">
                {data.series.some((p) => p.orders > 0) ? (
                  <TrendChart data={data.series} metric={metric} />
                ) : (
                  <EmptyState compact icon={<Activity className="h-6 w-6" />} title="No orders in this range" description="Pick a longer range to see the trend." />
                )}
              </div>
            </Card>

            <Card className="flex h-full flex-col">
              <CardHeader title="Orders by status" description={data.range.label} />
              <StatusDonut data={data.statusBreakdown} />
              <div className="mt-auto border-t border-line px-5 pb-5 pt-4">
                <p className="mb-2.5 text-[13px] font-medium text-muted">Payment method (excl. cancelled)</p>
                <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-[#eef3f0]" role="img" aria-label={data.paymentSplit.map((p) => `${p.method === 'cod' ? 'Cash' : 'Online'} ${paymentTotal ? formatPercent(p.orders / paymentTotal) : '0%'}`).join(', ')}>
                  {data.paymentSplit.map((p, i) =>
                    p.orders ? (
                      <span
                        key={p.method}
                        className={cn('h-full', i > 0 && 'border-l border-white')}
                        style={{ width: `${(p.orders / Math.max(1, paymentTotal)) * 100}%`, background: p.method === 'cod' ? '#1a663b' : '#3a74d6' }}
                      />
                    ) : null
                  )}
                </div>
                <p className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-ink">
                  {data.paymentSplit.map((p, i) => (
                    <React.Fragment key={p.method}>
                      {i > 0 && <span aria-hidden className="text-subtle">·</span>}
                      <span className="inline-flex items-center gap-1.5">
                        <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: p.method === 'cod' ? '#1a663b' : '#3a74d6' }} />
                        {p.method === 'cod' ? 'Cash' : 'Online'}
                        <span className="tabular font-semibold">{paymentTotal ? formatPercent(p.orders / paymentTotal) : '0%'}</span>
                      </span>
                    </React.Fragment>
                  ))}
                </p>
              </div>
            </Card>
          </div>

          {/* Lists */}
          <div className="grid items-stretch gap-6 lg:grid-cols-3">
            <Card className="h-full">
              <CardHeader title="Top products" description="By revenue in this range" icon={<Flame className="h-[18px] w-[18px]" />} />
              {data.topProducts.length ? (
                <ol className="space-y-1 px-5 pb-5 pt-4">
                  {data.topProducts.map((p) => (
                    <li key={p.id}>
                      <Link href={`/products/${encodeURIComponent(p.id)}`} className="-mx-2 flex h-12 items-center gap-3 rounded-xl px-2 transition hover:bg-mint-25">
                        <Thumb src={p.image} className="h-9 w-9" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-ink">{p.name}</span>
                          <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-[#eef3f0]">
                            <span className="fb-grow-x block h-full rounded-full bg-primary" style={{ width: `${(p.revenue / maxProduct) * 100}%` }} />
                          </span>
                        </span>
                        <span className="text-right">
                          <span className="tabular block text-sm font-semibold text-ink">{formatBDT(p.revenue)}</span>
                          <span className="tabular block text-[13px] text-muted">{formatNumber(p.qty)} sold</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ol>
              ) : (
                <EmptyState compact icon={<Flame className="h-6 w-6" />} title="No sales yet" description="Best sellers appear here once orders come in." />
              )}
            </Card>

            <Card className="h-full">
              <CardHeader title="Top categories" description="Top-level aisles by revenue" icon={<FolderTree className="h-[18px] w-[18px]" />} />
              {data.topCategories.length ? (
                <ol className="space-y-3 px-5 pb-5 pt-4">
                  {data.topCategories.map((c) => (
                    <li key={c.id}>
                      <div className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="truncate font-medium text-ink">{c.name}</span>
                        <span className="tabular shrink-0 font-semibold text-ink">{formatBDT(c.revenue)}</span>
                      </div>
                      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[#eef3f0]">
                        <div className="fb-grow-x h-full rounded-full bg-[#16a3a0]" style={{ width: `${(c.revenue / maxCategory) * 100}%` }} />
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <EmptyState compact icon={<FolderTree className="h-6 w-6" />} title="No category sales" description="Sales by aisle appear once orders come in." />
              )}
            </Card>

            <Card className="h-full">
              <CardHeader
                title="Low stock"
                description={`${data.lowStockTotal} active products at ${LOW_STOCK_THRESHOLD} or fewer`}
                icon={<AlertTriangle className="h-[18px] w-[18px]" />}
                actions={
                  data.lowStockTotal > 0 ? (
                    <Link href="/products?stock=low" className="rounded-lg px-2 py-1 text-[13px] font-semibold text-primary-600 hover:bg-mint">
                      View all
                    </Link>
                  ) : undefined
                }
              />
              {data.lowStock.length ? (
                <ul className="space-y-1 px-5 pb-5 pt-4">
                  {data.lowStock.map((p) => (
                    <li key={p.id}>
                      <Link href={`/products/${encodeURIComponent(p.id)}`} className="-mx-2 flex h-12 items-center gap-3 rounded-xl px-2 transition hover:bg-mint-25">
                        <Thumb src={p.image} className="h-9 w-9" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-ink">{p.name}</span>
                          <span className="block text-[13px] text-muted">{p.unit}</span>
                        </span>
                        <span
                          className={cn(
                            'tabular rounded-full px-2.5 py-0.5 text-[13px] font-semibold',
                            p.stock <= 0 ? 'bg-red-50 text-red-700' : 'bg-[#fef5dc] text-[#7a4b06]'
                          )}
                        >
                          {p.stock <= 0 ? 'Out' : `${p.stock} left`}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState compact icon={<PackageCheck className="h-6 w-6" />} title="Stock looks healthy" description="No active product is running low." />
              )}
            </Card>
          </div>

          {/* Recent orders + activity */}
          <div className="grid items-stretch gap-6 xl:grid-cols-3">
            <Card className="h-full xl:col-span-2">
              <CardHeader
                title="Recent orders"
                description="Latest six orders, any date"
                actions={
                  <Link href="/orders" className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[13px] font-semibold text-primary-600 hover:bg-mint">
                    All orders <ArrowRight className="h-4 w-4" />
                  </Link>
                }
              />
              {data.recentOrders.length ? (
                <ul className="divide-y divide-[#edf4ef] px-5 pb-3 pt-3">
                  {data.recentOrders.map((o) => (
                    <li key={o.id}>
                      <Link href={`/orders/${encodeURIComponent(o.id)}`} className="-mx-2 flex min-h-[60px] flex-wrap items-center gap-x-4 gap-y-1 rounded-xl px-2 py-2 transition hover:bg-mint-25">
                        <span className="min-w-0 flex-1">
                          <span className="tabular block text-sm font-semibold text-ink">{o.id}</span>
                          <span className="block truncate text-[13px] text-muted">
                            {o.customer.name} · {o.customer.area} · {formatRelative(o.createdAt)}
                          </span>
                        </span>
                        <span className="hidden sm:block">
                          <PaymentBadge order={o} compact />
                        </span>
                        <StatusBadge status={o.status} />
                        <span className="tabular w-20 text-right text-sm font-semibold text-ink">{formatBDT(o.total)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState icon={<ShoppingBag className="h-6 w-6" />} title="No orders yet" description="New orders from the storefront appear here." />
              )}
            </Card>

            <Card className="flex h-full flex-col">
              <CardHeader title="Activity" description="Orders, reviews, messages and sign-ups" icon={<Activity className="h-[18px] w-[18px]" />} />
              {data.activity.length ? (
                <>
                  <ol className="flex-1 space-y-1 px-5 pb-2 pt-4">
                    {activity.map((a) => {
                      const { icon: Icon, cls } = ACTIVITY_ICON[a.kind];
                      const body = (
                        <>
                          <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-xl', cls)}>
                            <Icon className="h-4 w-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-ink">{a.title}</span>
                            <span className="block truncate text-[13px] text-muted">
                              {a.detail ? `${a.detail} · ` : ''}
                              {formatRelative(a.at)}
                            </span>
                          </span>
                        </>
                      );
                      return (
                        <li key={a.id}>
                          {a.href ? (
                            <Link href={a.href} className="-mx-2 flex min-h-12 items-center gap-3 rounded-xl px-2 py-1.5 transition hover:bg-mint-25">
                              {body}
                            </Link>
                          ) : (
                            <div className="flex min-h-12 items-center gap-3 py-1.5">{body}</div>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                  {data.activity.length > ACTIVITY_PAGE && (
                    <Pagination
                      className="border-t border-line"
                      page={activityPage}
                      pageSize={ACTIVITY_PAGE}
                      total={data.activity.length}
                      onPageChange={setActivityPage}
                      noun="events"
                    />
                  )}
                </>
              ) : (
                <EmptyState compact icon={<Activity className="h-6 w-6" />} title="Quiet so far" description="Store activity shows up here." />
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
