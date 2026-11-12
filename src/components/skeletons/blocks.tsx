import React from 'react';
import { cn } from '@/lib/cn';
import { LoadingRegion, Skeleton } from '@/components/ui/Skeleton';

// Skeleton building blocks. Each mirrors the real component's box exactly
// (same card, padding, heights) so nothing shifts when data arrives.

export function CardSkeleton({ className = '', children }: { className?: string; children?: React.ReactNode }) {
  return <div className={cn('rounded-2xl border border-line bg-white shadow-soft', className)}>{children}</div>;
}

export function CardHeaderSkeleton({ action = false }: { action?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 px-5 pt-5">
      <div className="space-y-2">
        <Skeleton className="h-[18px] w-40" />
        <Skeleton className="h-3.5 w-56" />
      </div>
      {action && <Skeleton className="h-8 w-24 rounded-xl" />}
    </div>
  );
}

export function KpiCardSkeleton() {
  return (
    <CardSkeleton className="h-[148px] p-5">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-9 w-9 rounded-xl" />
      </div>
      <Skeleton className="mt-4 h-8 w-32" />
      <Skeleton className="mt-3 h-5 w-28 rounded-full" />
    </CardSkeleton>
  );
}

/** Table card skeleton: toolbar, header, rows. `cols` widths drive the shape. */
export function TableSkeleton({
  rows = 8,
  cols = ['w-40', 'w-28', 'w-24', 'w-20', 'w-16'],
  toolbar = true,
  tabs = 0,
  thumb = false,
  selectable = false,
  footer = true,
}: {
  rows?: number;
  cols?: string[];
  toolbar?: boolean;
  tabs?: number;
  thumb?: boolean;
  selectable?: boolean;
  footer?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-soft">
      {tabs > 0 && (
        <div className="flex gap-4 border-b border-line px-4">
          {Array.from({ length: tabs }, (_, i) => (
            <div key={i} className="flex h-11 items-center gap-2">
              <Skeleton className="h-3.5 w-16" />
              <Skeleton className="h-4 w-6 rounded-full" />
            </div>
          ))}
        </div>
      )}
      {toolbar && (
        <div className="flex flex-wrap items-center gap-2.5 border-b border-line p-3 sm:p-4">
          <Skeleton className="h-10 w-full max-w-sm rounded-xl" />
          <Skeleton className="h-10 w-36 rounded-xl" />
          <Skeleton className="h-10 w-36 rounded-xl" />
          <Skeleton className="ml-auto h-9 w-24 rounded-xl" />
        </div>
      )}
      <div className="hidden border-b border-line bg-[#f6faf7] px-4 py-3.5 md:flex md:items-center md:gap-8">
        {selectable && <Skeleton className="h-[18px] w-[18px] rounded-md" />}
        {cols.map((w, i) => (
          <Skeleton key={i} className={cn('h-3.5', i === 0 ? 'w-24' : 'w-16')} />
        ))}
      </div>
      <div>
        {Array.from({ length: rows }, (_, r) => (
          <div key={r} className="flex h-[60px] items-center gap-8 border-b border-[#edf4ef] px-4">
            {selectable && <Skeleton className="h-[18px] w-[18px] shrink-0 rounded-md" />}
            {cols.map((w, i) =>
              i === 0 && thumb ? (
                <div key={i} className="flex min-w-0 flex-1 items-center gap-3">
                  <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
                  <div className="w-full max-w-48 space-y-1.5">
                    <Skeleton className="h-3.5 w-11/12" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ) : (
                <Skeleton key={i} className={cn('h-3.5', w, i === 0 ? 'flex-1 max-w-48' : 'hidden shrink-0 md:block')} />
              )
            )}
          </div>
        ))}
      </div>
      {footer && (
        <div className="flex items-center justify-between px-4 py-3">
          <Skeleton className="h-3.5 w-40" />
          <div className="flex gap-1">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-9 w-9 rounded-lg" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function PageSkeleton({ label, children }: { label: string; children: React.ReactNode }) {
  return <LoadingRegion label={label}>{children}</LoadingRegion>;
}

export function PageHeaderSkeleton({ actions = 1 }: { actions?: number }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4" aria-hidden>
      <div className="space-y-2.5">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80 max-w-[70vw]" />
      </div>
      <div className="flex gap-2">
        {Array.from({ length: actions }, (_, i) => (
          <Skeleton key={i} className="h-10 w-32 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
