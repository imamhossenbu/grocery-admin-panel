'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { PAGE_SIZES } from '@/lib/constants';
import { formatNumber } from '@/lib/format';
import { Select } from './Select';

function pages(current: number, last: number): (number | 'gap')[] {
  if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1);
  const set = new Set([1, last, current, current - 1, current + 1]);
  if (current <= 3) [2, 3, 4].forEach((p) => set.add(p));
  if (current >= last - 2) [last - 1, last - 2, last - 3].forEach((p) => set.add(p));
  const sorted = [...set].filter((p) => p >= 1 && p <= last).sort((a, b) => a - b);
  const out: (number | 'gap')[] = [];
  sorted.forEach((p, i) => {
    if (i && p - sorted[i - 1] > 1) out.push('gap');
    out.push(p);
  });
  return out;
}

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  noun = 'results',
  className = '',
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  noun?: string;
  className?: string;
}) {
  const last = Math.max(1, Math.ceil(total / pageSize));
  const from = total ? (page - 1) * pageSize + 1 : 0;
  const to = Math.min(total, page * pageSize);
  const btn =
    'grid h-9 min-w-9 cursor-pointer place-items-center rounded-lg px-2 text-[13px] font-semibold tabular transition-[background-color,color,transform] duration-150 active:scale-95 disabled:pointer-events-none disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40';

  return (
    <nav aria-label="Pagination" className={cn('flex flex-wrap items-center justify-between gap-3 px-4 py-3', className)}>
      <div className="flex items-center gap-3 text-[13px] text-muted">
        <span className="tabular">
          {total ? (
            <>
              <strong className="font-semibold text-ink">{formatNumber(from)}–{formatNumber(to)}</strong> of {formatNumber(total)} {noun}
            </>
          ) : (
            `No ${noun}`
          )}
        </span>
        {onPageSizeChange && (
          <span className="hidden items-center gap-2 sm:flex">
            <span aria-hidden>·</span>
            <Select
              size="sm"
              value={String(pageSize)}
              onChange={(v) => onPageSizeChange(Number(v))}
              options={PAGE_SIZES.map((n) => ({ value: String(n), label: `${n} per page` }))}
              searchable={false}
              aria-label="Rows per page"
              className="w-36"
            />
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-1">
        {last > 7 && (
          <form
            className="mr-2 hidden items-center gap-2 text-[13px] text-muted lg:flex"
            onSubmit={(e) => {
              e.preventDefault();
              const n = Number(new FormData(e.currentTarget).get('jump'));
              if (Number.isInteger(n) && n >= 1 && n <= last) onPageChange(n);
              e.currentTarget.reset();
            }}
          >
            <label htmlFor="fb-jump">Go to</label>
            <input
              id="fb-jump"
              name="jump"
              inputMode="numeric"
              placeholder={String(page)}
              aria-label={`Go to page (1 to ${last})`}
              className="tabular h-9 w-14 rounded-lg border border-line-strong bg-white px-2 text-center text-[13px] text-ink outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
            />
          </form>
        )}
        <button type="button" className={cn(btn, 'hidden text-muted hover:bg-mint sm:grid')} disabled={page <= 1} onClick={() => onPageChange(1)} aria-label="First page">
          <ChevronsLeft className="h-4 w-4" />
        </button>
        <button type="button" className={cn(btn, 'text-muted hover:bg-mint')} disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label="Previous page">
          <ChevronLeft className="h-4 w-4" />
        </button>
        {pages(page, last).map((p, i) =>
          p === 'gap' ? (
            <span key={`g${i}`} className="px-1 text-muted" aria-hidden>
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              aria-current={p === page ? 'page' : undefined}
              aria-label={`Page ${p}`}
              className={cn(btn, p === page ? 'bg-forest text-white shadow-soft' : 'text-ink hover:bg-mint')}
            >
              {p}
            </button>
          )
        )}
        <button type="button" className={cn(btn, 'text-muted hover:bg-mint')} disabled={page >= last} onClick={() => onPageChange(page + 1)} aria-label="Next page">
          <ChevronRight className="h-4 w-4" />
        </button>
        <button type="button" className={cn(btn, 'hidden text-muted hover:bg-mint sm:grid')} disabled={page >= last} onClick={() => onPageChange(last)} aria-label="Last page">
          <ChevronsRight className="h-4 w-4" />
        </button>
      </div>
    </nav>
  );
}
