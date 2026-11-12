'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import * as RT from '@radix-ui/react-tabs';
import { createColumnHelper } from '@tanstack/react-table';
import { Users } from 'lucide-react';
import type { CustomerFilters, CustomerRow, Paged } from '@/types/admin';
import { formatBDT, formatNumber } from '@/lib/format';
import { formatDate, formatRelative } from '@/lib/dates';
import { formatLocality } from '@/lib/address';
import { useUrlState } from '@/lib/client/use-url-state';
import { DataTable } from '@/components/ui/DataTable';
import { TabsContent, TabsList } from '@/components/ui/Tabs';
import { SearchInput } from '@/components/ui/Input';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState } from '@/components/ui/EmptyState';
import { Avatar, Kbd } from '@/components/ui/Card';

const col = createColumnHelper<CustomerRow>();
const href = (c: CustomerRow) => `/customers/${c.id}`;

export function CustomersView({
  data,
  filters,
}: {
  data: Paged<CustomerRow> & { totals: { all: number; buyers: number; repeat: number } };
  filters: CustomerFilters;
}) {
  const { set, isPending } = useUrlState();

  const columns = useMemo(
    () => [
      col.accessor('name', {
        id: 'name',
        header: 'Customer',
        meta: { alwaysVisible: true, skeleton: 'avatar', className: 'min-w-[240px]' },
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <Avatar name={row.original.name} />
            <div className="min-w-0">
              <Link href={href(row.original)} className="block max-w-[240px] truncate font-medium text-ink hover:text-primary">
                {row.original.name}
              </Link>
              <p className="max-w-[240px] truncate text-[13px] text-muted">{row.original.email || 'No email'}</p>
            </div>
          </div>
        ),
      }),
      col.accessor('phone', {
        id: 'phone',
        header: 'Phone',
        enableSorting: false,
        meta: { label: 'Phone', skeleton: 'text' },
        cell: ({ getValue }) => <span className="tabular text-muted">{getValue() || '—'}</span>,
      }),
      col.display({
        id: 'location',
        header: 'Location',
        meta: { label: 'Location', skeleton: 'text' },
        cell: ({ row }) => (
          <span className="block max-w-[200px] truncate text-muted">{formatLocality({ area: row.original.area, city: row.original.city }) || '—'}</span>
        ),
      }),
      col.accessor('ordersCount', {
        id: 'orders',
        header: 'Orders',
        meta: { label: 'Orders', align: 'right', skeleton: 'number', sortDescFirst: true },
        cell: ({ getValue }) => <span className="tabular font-medium text-ink">{formatNumber(getValue())}</span>,
      }),
      col.accessor('totalSpent', {
        id: 'spent',
        header: 'Total spent',
        meta: { label: 'Total spent', align: 'right', skeleton: 'number', sortDescFirst: true },
        cell: ({ getValue }) => <span className="tabular font-semibold text-ink">{formatBDT(getValue())}</span>,
      }),
      col.accessor('lastOrderAt', {
        id: 'last_order',
        header: 'Last order',
        meta: { label: 'Last order', skeleton: 'text', sortDescFirst: true },
        cell: ({ getValue }) => <span className="tabular whitespace-nowrap text-muted">{getValue() ? formatRelative(getValue()) : 'Never'}</span>,
      }),
      col.accessor('joinedAt', {
        id: 'joined',
        header: 'Joined',
        enableSorting: false,
        meta: { label: 'Joined', skeleton: 'text' },
        cell: ({ getValue }) => <span className="tabular whitespace-nowrap text-muted">{formatDate(getValue())}</span>,
      }),
    ],
    []
  );

  return (
    <RT.Root value={filters.segment} onValueChange={(v) => set({ segment: v === 'all' ? null : v })}>
      <TabsList
        className="mb-4"
        aria-label="Customer segments"
        value={filters.segment}
        items={[
          { value: 'all', label: 'All', count: data.totals.all },
          { value: 'buyers', label: 'Have ordered', count: data.totals.buyers },
          { value: 'repeat', label: 'Repeat buyers', count: data.totals.repeat },
          { value: 'no-orders', label: 'No orders yet', count: data.totals.all - data.totals.buyers },
        ]}
      />
      <TabsContent value={filters.segment} className="outline-none" tabIndex={-1}>
        <DataTable
          tableId="customers"
          caption="Customers"
          data={data.rows}
          columns={columns}
          getRowId={(c) => c.id}
          rowHref={href}
          loading={isPending}
          skeletonRows={Math.min(filters.pageSize, 10)}
          sort={{ id: filters.sort, desc: filters.dir === 'desc' }}
          onSortChange={(s) => set({ sort: s ? s.id : null, dir: s ? (s.desc ? 'desc' : 'asc') : null })}
          scrollKey={filters.page}
          toolbar={
            <SearchInput
              data-page-search
              value={filters.q}
              debounce={300}
              onChange={(q) => set({ q })}
              placeholder="Search name, email, phone or area…"
              aria-label="Search customers"
              className="w-full min-w-60 flex-1 sm:max-w-md"
              hint={<Kbd className="mr-1">/</Kbd>}
            />
          }
          empty={
            <EmptyState
              icon={<Users className="h-6 w-6" />}
              title={filters.q || filters.segment !== 'all' ? 'No customers match' : 'No customer accounts yet'}
              description="Customers appear here after they create an account on the storefront. Guest checkouts are listed on the Orders page."
            />
          }
          mobileCard={(c) => (
            <div className="flex items-center gap-3 p-4">
              <Avatar name={c.name} />
              <div className="min-w-0 flex-1">
                <Link href={href(c)} className="block truncate font-medium text-ink">
                  {c.name}
                </Link>
                <p className="truncate text-[13px] text-muted">{c.phone || c.email}</p>
              </div>
              <div className="text-right">
                <p className="tabular font-semibold text-ink">{formatBDT(c.totalSpent)}</p>
                <p className="tabular text-[13px] text-muted">{c.ordersCount} orders</p>
              </div>
            </div>
          )}
          footer={
            <Pagination
              className="border-t border-line"
              page={filters.page}
              pageSize={filters.pageSize}
              total={data.total}
              noun="customers"
              onPageChange={(page) => set({ page: page > 1 ? page : null }, { keepPage: true })}
              onPageSizeChange={(size) => set({ size })}
            />
          }
        />
      </TabsContent>
    </RT.Root>
  );
}
