'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import * as RT from '@radix-ui/react-tabs';
import { createColumnHelper } from '@tanstack/react-table';
import { Download, Eye, FilterX, MoreHorizontal, Printer, RotateCcw, ShoppingBag, Truck } from 'lucide-react';
import { ORDER_STATUSES, PAYMENT_STATUSES, type Order, type OrderStatus } from '@/types/store';
import type { OrderFilters, OrdersPage } from '@/types/admin';
import { cn } from '@/lib/cn';
import { formatBDT } from '@/lib/format';
import { formatDateTime } from '@/lib/dates';
import { formatLocality } from '@/lib/address';
import { PAYMENT_STATUS_LABEL, STATUS_META, itemCount, nextStatus } from '@/lib/order-meta';
import { useUrlState } from '@/lib/client/use-url-state';
import { useStoreAction } from '@/lib/client/store-action';
import { DataTable } from '@/components/ui/DataTable';
import { TabsContent, TabsList } from '@/components/ui/Tabs';
import { SearchInput } from '@/components/ui/Input';
import { MultiSelect, Select } from '@/components/ui/Select';
import { DateRangePicker } from '@/components/ui/DatePicker';
import { Pagination } from '@/components/ui/Pagination';
import { Button, buttonClass } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Kbd } from '@/components/ui/Card';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { Tooltip } from '@/components/ui/Tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import { PaymentBadge, StatusBadge } from './OrderBadges';
import { RelativeTime } from '@/components/ui/RelativeTime';

const col = createColumnHelper<Order>();
const orderHref = (o: Order) => `/orders/${encodeURIComponent(o.id)}`;

export function OrdersView({ data, filters }: { data: OrdersPage; filters: OrderFilters }) {
  const { set, reset, params, isPending } = useUrlState();
  const { run, busy, refreshing } = useStoreAction();
  const confirm = useConfirm();

  const changeStatus = async (ids: string[], status: OrderStatus, clear?: () => void) => {
    const many = ids.length > 1;
    const ok = await confirm({
      title: many ? `Mark ${ids.length} orders as ${status}?` : `Mark ${ids[0]} as ${status}?`,
      description:
        status === 'Cancelled'
          ? 'Cancelling puts the items back into stock. Customers who paid online will need a refund.'
          : 'Each order gets a new entry in its status history.',
      confirmLabel: many ? `Update ${ids.length} orders` : `Mark ${status}`,
      tone: status === 'Cancelled' ? 'danger' : 'default',
    });
    if (!ok) return;
    const out = many
      ? await run('BULK_UPDATE_ORDER_STATUS', { ids, status }, { success: `${ids.length} orders marked ${status}` })
      : await run('UPDATE_ORDER_STATUS', { id: ids[0], status }, { success: `Order ${ids[0]} marked ${status}` });
    if (out.ok) clear?.();
  };

  const columns = useMemo(
    () => [
      col.accessor('id', {
        id: 'id',
        header: 'Order',
        meta: { alwaysVisible: true, skeleton: 'text', className: 'min-w-[150px]' },
        cell: ({ row }) => (
          <div>
            <Link href={orderHref(row.original)} className="tabular font-semibold text-ink hover:text-primary hover:underline">
              {row.original.id}
            </Link>
            <p className="text-[13px] text-muted">{itemCount(row.original)} items</p>
          </div>
        ),
      }),
      col.accessor((o) => o.customer.name, {
        id: 'customer_name',
        header: 'Customer',
        meta: { label: 'Customer', skeleton: 'text', className: 'min-w-[180px]' },
        cell: ({ row }) => (
          <div className="max-w-[220px]">
            <p className="truncate font-medium text-ink">{row.original.customer.name}</p>
            <p className="tabular text-[13px] text-muted">{row.original.customer.phone}</p>
          </div>
        ),
      }),
      col.display({
        id: 'location',
        header: 'Location',
        meta: { label: 'Location', skeleton: 'text' },
        cell: ({ row }) => {
          const c = row.original.customer;
          return <span className="block max-w-[200px] truncate text-muted">{formatLocality(c) || '—'}</span>;
        },
      }),
      col.accessor('createdAt', {
        id: 'created_at',
        header: 'Placed',
        meta: { label: 'Placed', skeleton: 'text', sortDescFirst: true, className: 'whitespace-nowrap' },
        cell: ({ getValue }) => (
          <Tooltip content={formatDateTime(getValue())}>
            <span className="tabular text-muted" tabIndex={0}>
              {<RelativeTime value={getValue()} />}
            </span>
          </Tooltip>
        ),
      }),
      col.display({
        id: 'payment',
        header: 'Payment',
        meta: { label: 'Payment', skeleton: 'badge' },
        cell: ({ row }) => <PaymentBadge order={row.original} compact />,
      }),
      col.accessor('status', {
        id: 'status',
        header: 'Status',
        meta: { label: 'Status', skeleton: 'badge' },
        cell: ({ getValue }) => <StatusBadge status={getValue()} />,
      }),
      col.accessor('total', {
        id: 'total',
        header: 'Total',
        meta: { label: 'Total', align: 'right', skeleton: 'number', sortDescFirst: true },
        cell: ({ getValue }) => <span className="tabular font-semibold text-ink">{formatBDT(getValue())}</span>,
      }),
      col.display({
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        enableHiding: false,
        meta: { alwaysVisible: true, align: 'right', skeleton: 'actions', className: 'w-14' },
        cell: ({ row }) => {
          const o = row.original;
          const next = nextStatus(o.status);
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${o.id}`}>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                <DropdownMenuItem asChild>
                  <Link href={orderHref(o)}>
                    <Eye /> View details
                  </Link>
                </DropdownMenuItem>
                {next && (
                  <DropdownMenuItem onSelect={() => changeStatus([o.id], next)}>
                    <Truck /> Mark {next}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <ShoppingBag /> Change status
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {ORDER_STATUSES.filter((s) => s !== o.status).map((s) => (
                      <DropdownMenuItem key={s} onSelect={() => changeStatus([o.id], s)} tone={s === 'Cancelled' ? 'danger' : 'default'}>
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_META[s].color }} />
                        {s}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={`${orderHref(o)}?print=1`}>
                    <Printer /> Print invoice
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const activeFilters =
    !!filters.q || filters.method !== 'all' || filters.pay.length > 0 || filters.refund || !!filters.from || !!filters.area || !!filters.district;
  const exportHref = `/api/admin/orders/export${params.toString() ? `?${params.toString()}` : ''}`;
  const tabs = [
    { value: 'all', label: 'All', count: data.statusCounts.all },
    ...ORDER_STATUSES.map((s) => ({ value: s, label: STATUS_META[s].short, count: data.statusCounts[s] })),
  ];

  return (
    <RT.Root value={filters.status} onValueChange={(v) => set({ status: v === 'all' ? null : v })}>
      <TabsList items={tabs} value={filters.status} aria-label="Order status" className="mb-4" />
      <TabsContent value={filters.status} className="outline-none" tabIndex={-1}>
        <DataTable
          tableId="orders"
          caption="Orders"
          data={data.rows}
          columns={columns}
          getRowId={(o) => o.id}
          rowHref={orderHref}
          loading={isPending || refreshing}
          skeletonRows={Math.min(filters.pageSize, 10)}
          sort={{ id: filters.sort, desc: filters.dir === 'desc' }}
          onSortChange={(s) => set({ sort: s ? s.id : null, dir: s ? (s.desc ? 'desc' : 'asc') : null })}
          selectable
          scrollKey={filters.page}
          rowClassName={(o) => (o.status === 'Pending' ? 'bg-[#fffcf3]' : undefined)}
          bulkActions={(rows, clear) => (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="highlight" size="sm" disabled={busy}>
                  <Truck className="h-4 w-4" /> Update status
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                <DropdownMenuLabel>Set {rows.length} orders to</DropdownMenuLabel>
                {ORDER_STATUSES.map((s) => (
                  <DropdownMenuItem key={s} onSelect={() => changeStatus(rows.map((r) => r.id), s, clear)} tone={s === 'Cancelled' ? 'danger' : 'default'}>
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_META[s].color }} />
                    {s}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          toolbarEnd={
            <a href={exportHref} className={buttonClass('outline', 'md')} download>
              <Download className="h-4 w-4" /> Export CSV
            </a>
          }
          toolbar={
            <>
              <SearchInput
                data-page-search
                value={filters.q}
                debounce={300}
                onChange={(q) => set({ q })}
                placeholder="Search ID, name, phone, email, transaction…"
                aria-label="Search orders"
                className="w-full min-w-60 flex-1 sm:max-w-sm"
                hint={<Kbd className="mr-1">/</Kbd>}
              />
              <Select
                className="w-44"
                value={filters.method}
                onChange={(v) => set({ method: v === 'all' ? null : v })}
                searchable={false}
                aria-label="Payment method"
                options={[
                  { value: 'all', label: 'All methods' },
                  { value: 'cod', label: 'Cash on delivery' },
                  { value: 'sslcommerz', label: 'Online (SSLCommerz)' },
                ]}
              />
              <MultiSelect
                className="w-52"
                label="Payment"
                values={filters.pay}
                onChange={(v) => set({ pay: v })}
                searchable={false}
                options={PAYMENT_STATUSES.map((p) => ({ value: p, label: PAYMENT_STATUS_LABEL[p] }))}
              />
              {data.districts.length > 0 && (
                <Select
                  className="w-40"
                  value={filters.district}
                  onChange={(v) => set({ district: v })}
                  onClear={() => set({ district: null })}
                  placeholder="All districts"
                  searchable
                  aria-label="District"
                  options={data.districts.map((d) => ({ value: d, label: d }))}
                />
              )}
              {data.areas.length > 0 && (
                <Select
                  className="w-40"
                  value={filters.area}
                  onChange={(v) => set({ area: v })}
                  onClear={() => set({ area: null })}
                  placeholder="All areas"
                  searchable="auto"
                  aria-label="Delivery area"
                  options={data.areas.map((a) => ({ value: a, label: a }))}
                />
              )}
              <DateRangePicker
                className="w-52"
                clearable
                placeholder="Any date"
                value={{ from: filters.from, to: filters.to }}
                onChange={({ range }) => set({ from: range.from || null, to: range.to || null })}
                aria-label="Order date"
              />
              <button
                type="button"
                aria-pressed={filters.refund}
                onClick={() => set({ refund: !filters.refund })}
                className={cn(
                  'inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border px-3.5 text-sm font-medium transition',
                  filters.refund ? 'border-red-300 bg-red-50 text-red-700' : 'border-line-strong bg-white text-ink hover:bg-mint-50'
                )}
              >
                <RotateCcw className="h-4 w-4" />
                Needs refund
                {data.refundCount > 0 && <span className="tabular rounded-full bg-red-600 px-1.5 text-xs text-white">{data.refundCount}</span>}
              </button>
              {activeFilters && (
                <Button variant="ghost" size="md" onClick={() => reset(['status', 'sort', 'dir', 'size'])}>
                  <FilterX className="h-4 w-4" /> Clear
                </Button>
              )}
            </>
          }
          empty={
            <EmptyState
              icon={<ShoppingBag className="h-6 w-6" />}
              title={activeFilters || filters.status !== 'all' ? 'No orders match these filters' : 'No orders yet'}
              description={activeFilters ? 'Try removing a filter or searching for something else.' : 'Orders placed on the storefront will appear here.'}
              action={
                activeFilters ? (
                  <Button variant="outline" size="sm" className="mt-5" onClick={() => reset(['status'])}>
                    <FilterX className="h-4 w-4" /> Clear filters
                  </Button>
                ) : undefined
              }
            />
          }
          mobileCard={(o) => (
            <div className="space-y-1.5 p-4 pr-12">
              <div className="flex items-center gap-2">
                <Link href={orderHref(o)} className="tabular font-semibold text-ink">
                  {o.id}
                </Link>
                <StatusBadge status={o.status} />
              </div>
              <p className="text-sm text-ink">
                {o.customer.name} · <span className="tabular text-muted">{o.customer.phone}</span>
              </p>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <PaymentBadge order={o} compact />
                <span className="tabular font-semibold text-ink">{formatBDT(o.total)}</span>
              </div>
              <p className="text-[13px] text-muted">{<RelativeTime value={o.createdAt} />}</p>
            </div>
          )}
          footer={
            <Pagination
              className="border-t border-line"
              page={filters.page}
              pageSize={filters.pageSize}
              total={data.total}
              noun="orders"
              onPageChange={(page) => set({ page: page > 1 ? page : null }, { keepPage: true })}
              onPageSizeChange={(size) => set({ size })}
            />
          }
        />
      </TabsContent>
    </RT.Root>
  );
}
