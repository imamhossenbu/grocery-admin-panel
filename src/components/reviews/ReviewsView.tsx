'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import * as RT from '@radix-ui/react-tabs';
import { createColumnHelper } from '@tanstack/react-table';
import { BadgeCheck, Eye, EyeOff, MoreHorizontal, Star, Trash2 } from 'lucide-react';
import type { ReviewFilters, ReviewRow, ReviewsPage } from '@/types/admin';
import { cn } from '@/lib/cn';
import { formatDateTime, formatRelative } from '@/lib/dates';
import { useUrlState } from '@/lib/client/use-url-state';
import { useStoreAction } from '@/lib/client/store-action';
import { DataTable } from '@/components/ui/DataTable';
import { TabsContent, TabsList } from '@/components/ui/Tabs';
import { SearchInput } from '@/components/ui/Input';
import { MultiSelect } from '@/components/ui/Select';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, Kbd, Thumb } from '@/components/ui/Card';
import { Tooltip } from '@/components/ui/Tooltip';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';

const col = createColumnHelper<ReviewRow>();

export function Stars({ n, size = 'sm' }: { n: number; size?: 'sm' | 'md' }) {
  const s = size === 'md' ? 'h-5 w-5' : 'h-4 w-4';
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`${n} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={cn(s, i <= Math.round(n) ? 'fill-[#e0a21a] text-[#e0a21a]' : 'text-[#cfdcd4]')} />
      ))}
    </span>
  );
}

function Comment({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  if (!text) return <span className="text-[13px] italic text-muted">No comment</span>;
  const long = text.length > 140;
  return (
    <p className="max-w-[60ch] text-sm leading-relaxed text-ink-2">
      {open || !long ? text : `${text.slice(0, 140).trimEnd()}…`}
      {long && (
        <button type="button" onClick={() => setOpen((o) => !o)} className="ml-1 cursor-pointer text-[13px] font-semibold text-primary-600 hover:underline">
          {open ? 'Less' : 'More'}
        </button>
      )}
    </p>
  );
}

export function ReviewsView({ data, filters }: { data: ReviewsPage; filters: ReviewFilters }) {
  const { set, isPending } = useUrlState();
  const { run, busy, refreshing } = useStoreAction();
  const confirm = useConfirm();

  const moderate = (r: ReviewRow, approved: boolean) =>
    run('SET_REVIEW_APPROVED', { id: r.id, approved }, { success: approved ? 'Review is visible on the storefront' : 'Review hidden', successDetail: 'The product rating was recalculated.' });

  const remove = async (r: ReviewRow) => {
    const ok = await confirm({
      title: 'Delete this review?',
      description: `${r.authorName}’s ${r.rating}★ review of ${r.productName} is removed permanently and the rating is recalculated. Hiding it keeps a record instead.`,
      confirmLabel: 'Delete review',
      tone: 'danger',
    });
    if (ok) await run('DELETE_REVIEW', { id: r.id }, { success: 'Review deleted' });
  };

  const columns = useMemo(
    () => [
      col.display({
        id: 'review',
        header: 'Review',
        meta: { alwaysVisible: true, skeleton: 'text', className: 'min-w-[340px]' },
        cell: ({ row }) => (
          <div className="space-y-1 py-1">
            <Stars n={row.original.rating} />
            <Comment text={row.original.comment} />
          </div>
        ),
      }),
      col.display({
        id: 'product',
        header: 'Product',
        meta: { label: 'Product', skeleton: 'thumb' },
        cell: ({ row }) => (
          <Link href={`/products/${encodeURIComponent(row.original.productId)}`} className="flex items-center gap-3 hover:text-primary">
            <Thumb src={row.original.productImage} className="h-9 w-9" />
            <span className="max-w-[200px] truncate text-sm font-medium">{row.original.productName}</span>
          </Link>
        ),
      }),
      col.display({
        id: 'author',
        header: 'Author',
        meta: { label: 'Author', skeleton: 'text' },
        cell: ({ row }) => (
          <div>
            <Link href={`/customers/${row.original.userId}`} className="block max-w-[180px] truncate font-medium text-ink hover:text-primary">
              {row.original.authorName}
            </Link>
            {row.original.verifiedPurchase && (
              <span className="inline-flex items-center gap-1 text-[13px] text-primary-600">
                <BadgeCheck className="h-4 w-4" /> Verified buyer
              </span>
            )}
          </div>
        ),
      }),
      col.display({
        id: 'date',
        header: 'Posted',
        meta: { label: 'Posted', skeleton: 'text' },
        cell: ({ row }) => (
          <Tooltip content={formatDateTime(row.original.createdAt)}>
            <span tabIndex={0} className="tabular whitespace-nowrap text-muted">
              {formatRelative(row.original.createdAt)}
            </span>
          </Tooltip>
        ),
      }),
      col.display({
        id: 'status',
        header: 'Status',
        meta: { label: 'Status', skeleton: 'badge' },
        cell: ({ row }) =>
          row.original.approved ? (
            <Badge tone="emerald" dot>
              Visible
            </Badge>
          ) : (
            <Badge tone="gray" dot>
              Hidden
            </Badge>
          ),
      }),
      col.display({
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        meta: { alwaysVisible: true, align: 'right', skeleton: 'actions', className: 'w-[150px]' },
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1">
            {row.original.approved ? (
              <Button variant="outline" size="sm" disabled={busy} onClick={() => moderate(row.original, false)}>
                <EyeOff className="h-4 w-4" /> Hide
              </Button>
            ) : (
              <Button variant="secondary" size="sm" disabled={busy} onClick={() => moderate(row.original, true)}>
                <Eye className="h-4 w-4" /> Approve
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label="More actions">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem asChild>
                  <Link href={`/products/${encodeURIComponent(row.original.productId)}`}>
                    <Eye /> Open product
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem tone="danger" onSelect={() => remove(row.original)}>
                  <Trash2 /> Delete review
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [busy]
  );

  const maxBar = Math.max(1, ...Object.values(data.distribution));

  return (
    <>
      <div className="mb-6 grid items-stretch gap-4 lg:grid-cols-3">
        <Card className="flex h-full items-center gap-5 p-5">
          <div>
            <p className="font-display tabular text-4xl font-semibold text-ink">{data.average.toFixed(1)}</p>
            <Stars n={data.average} size="md" />
          </div>
          <p className="text-sm text-muted">
            Average of <span className="tabular font-semibold text-ink">{data.counts.all}</span> reviews ·{' '}
            <span className="tabular font-semibold text-ink">{data.counts.hidden}</span> hidden
          </p>
        </Card>
        <Card className="h-full p-5 lg:col-span-2">
          <ul className="grid grid-cols-[auto_1fr_3rem] items-center gap-x-3 gap-y-1.5" aria-label="Rating distribution">
            {([5, 4, 3, 2, 1] as const).map((n) => (
              <li key={n} className="col-span-3 grid grid-cols-subgrid items-center">
                <button
                  type="button"
                  onClick={() => set({ rating: (filters.rating.includes(n) ? filters.rating.filter((x) => x !== n) : [...filters.rating, n]).map(String) })}
                  className={cn('flex cursor-pointer items-center gap-1 rounded-md px-1 text-[13px] font-medium', filters.rating.includes(n) ? 'text-primary-600' : 'text-ink')}
                  aria-pressed={filters.rating.includes(n)}
                >
                  {n} <Star className="h-3.5 w-3.5 fill-[#e0a21a] text-[#e0a21a]" />
                </button>
                <span className="h-2 overflow-hidden rounded-full bg-[#eef3f0]">
                  <span className="fb-grow-x block h-full rounded-full bg-[#e0a21a]" style={{ width: `${(data.distribution[n] / maxBar) * 100}%` }} />
                </span>
                <span className="tabular text-right text-[13px] text-muted">{data.distribution[n]}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <RT.Root value={filters.status} onValueChange={(v) => set({ status: v === 'all' ? null : v })}>
        <TabsList
          className="mb-4"
          aria-label="Review status"
          value={filters.status}
          items={[
            { value: 'all', label: 'All', count: data.counts.all },
            { value: 'approved', label: 'Visible', count: data.counts.approved },
            { value: 'hidden', label: 'Hidden', count: data.counts.hidden },
          ]}
        />
        <TabsContent value={filters.status} className="outline-none" tabIndex={-1}>
          <DataTable
            tableId="reviews"
            caption="Reviews"
            data={data.rows}
            columns={columns}
            getRowId={(r) => r.id}
            loading={isPending || refreshing}
            scrollKey={filters.page}
            toolbar={
              <>
                <SearchInput
                  data-page-search
                  value={filters.q}
                  debounce={300}
                  onChange={(q) => set({ q })}
                  placeholder="Search author or comment…"
                  aria-label="Search reviews"
                  className="w-full min-w-60 flex-1 sm:max-w-sm"
                  hint={<Kbd className="mr-1">/</Kbd>}
                />
                <MultiSelect
                  className="w-48"
                  label="Rating"
                  values={filters.rating.map(String) as ('1' | '2' | '3' | '4' | '5')[]}
                  onChange={(v) => set({ rating: v })}
                  searchable={false}
                  options={(['5', '4', '3', '2', '1'] as const).map((n) => ({ value: n, label: `${n} star${n === '1' ? '' : 's'}` }))}
                />
              </>
            }
            empty={<EmptyState icon={<Star className="h-6 w-6" />} title="No reviews here" description="Reviews written on the storefront appear here for moderation." />}
            mobileCard={(r) => (
              <div className="space-y-2 p-4">
                <div className="flex items-center justify-between gap-2">
                  <Stars n={r.rating} />
                  {r.approved ? <Badge tone="emerald">Visible</Badge> : <Badge tone="gray">Hidden</Badge>}
                </div>
                <Comment text={r.comment} />
                <p className="text-[13px] text-muted">
                  {r.authorName} on {r.productName} · {formatRelative(r.createdAt)}
                </p>
                <div className="flex gap-2">
                  <Button variant={r.approved ? 'outline' : 'secondary'} size="sm" onClick={() => moderate(r, !r.approved)} disabled={busy}>
                    {r.approved ? 'Hide' : 'Approve'}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => remove(r)} disabled={busy}>
                    Delete
                  </Button>
                </div>
              </div>
            )}
            footer={
              <Pagination
                className="border-t border-line"
                page={filters.page}
                pageSize={filters.pageSize}
                total={data.total}
                noun="reviews"
                onPageChange={(page) => set({ page: page > 1 ? page : null }, { keepPage: true })}
                onPageSizeChange={(size) => set({ size })}
              />
            }
          />
        </TabsContent>
      </RT.Root>
    </>
  );
}
