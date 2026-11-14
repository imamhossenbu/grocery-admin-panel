'use client';

import React, { useMemo } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { Download, Mail, Newspaper } from 'lucide-react';
import type { Paged, Subscriber } from '@/types/admin';
import { formatNumber } from '@/lib/format';
import { formatDateTime } from '@/lib/dates';
import { useUrlState } from '@/lib/client/use-url-state';
import { DataTable } from '@/components/ui/DataTable';
import { SearchInput } from '@/components/ui/Input';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState } from '@/components/ui/EmptyState';
import { buttonClass } from '@/components/ui/Button';
import { Avatar, Kbd } from '@/components/ui/Card';
import { CountUp } from '@/components/ui/CountUp';
import { RelativeTime } from '@/components/ui/RelativeTime';

const col = createColumnHelper<Subscriber>();

export function NewsletterView({
  data,
  filters,
}: {
  data: Paged<Subscriber> & { all: number; thisMonth: number };
  filters: { q: string; page: number; pageSize: number };
}) {
  const { set, isPending } = useUrlState();
  const columns = useMemo(
    () => [
      col.accessor('email', {
        header: 'Email',
        meta: { alwaysVisible: true, skeleton: 'avatar' },
        cell: ({ getValue }) => (
          <div className="flex items-center gap-3">
            <Avatar name={getValue()} />
            <a href={`mailto:${getValue()}`} className="truncate font-medium text-ink hover:text-primary">
              {getValue()}
            </a>
          </div>
        ),
      }),
      col.accessor('createdAt', {
        header: 'Subscribed',
        meta: { label: 'Subscribed', skeleton: 'text' },
        cell: ({ getValue }) => (
          <span className="tabular whitespace-nowrap text-muted">
            {formatDateTime(getValue())} · {<RelativeTime value={getValue()} />}
          </span>
        ),
      }),
    ],
    []
  );

  return (
    <>
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-line bg-white p-5 shadow-soft">
          <p className="text-[13px] font-medium text-muted">Subscribers</p>
          <p className="font-display tabular mt-1 text-2xl font-semibold text-ink">
            <CountUp value={data.all} format={formatNumber} />
          </p>
        </div>
        <div className="rounded-2xl border border-line bg-white p-5 shadow-soft">
          <p className="text-[13px] font-medium text-muted">Joined in the last 30 days</p>
          <p className="font-display tabular mt-1 text-2xl font-semibold text-ink">
            <CountUp value={data.thisMonth} format={formatNumber} />
          </p>
        </div>
      </div>
      <DataTable
        tableId="newsletter"
        caption="Newsletter subscribers"
        data={data.rows}
        columns={columns}
        getRowId={(s) => s.email}
        loading={isPending}
        scrollKey={filters.page}
        toolbar={
          <SearchInput
            data-page-search
            value={filters.q}
            debounce={300}
            onChange={(q) => set({ q })}
            placeholder="Search email…"
            aria-label="Search subscribers"
            className="w-full min-w-60 flex-1 sm:max-w-sm"
            hint={<Kbd className="mr-1">/</Kbd>}
          />
        }
        toolbarEnd={
          <a href="/api/admin/newsletter/export" download className={buttonClass('outline', 'md')}>
            <Download className="h-4 w-4" /> Export CSV
          </a>
        }
        empty={<EmptyState icon={<Newspaper className="h-6 w-6" />} title={filters.q ? 'No subscribers match' : 'No subscribers yet'} description="People who sign up in the storefront footer appear here." />}
        mobileCard={(s) => (
          <div className="flex items-center gap-3 p-4">
            <Mail className="h-4 w-4 text-muted" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-ink">{s.email}</p>
              <p className="text-[13px] text-muted">{<RelativeTime value={s.createdAt} />}</p>
            </div>
          </div>
        )}
        footer={
          <Pagination
            className="border-t border-line"
            page={filters.page}
            pageSize={filters.pageSize}
            total={data.total}
            noun="subscribers"
            onPageChange={(page) => set({ page: page > 1 ? page : null }, { keepPage: true })}
            onPageSizeChange={(size) => set({ size })}
          />
        }
      />
    </>
  );
}
