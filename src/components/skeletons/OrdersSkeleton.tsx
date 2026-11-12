import { Skeleton } from '@/components/ui/Skeleton';
import { CardHeaderSkeleton, CardSkeleton, PageSkeleton, TableSkeleton } from './blocks';

export function OrdersSkeleton() {
  return (
    <PageSkeleton label="Loading orders">
      <div className="mb-4 flex gap-4 border-b border-line" aria-hidden>
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="flex h-11 items-center gap-2 px-3">
            <Skeleton className="h-3.5 w-16" />
            <Skeleton className="h-4 w-7 rounded-full" />
          </div>
        ))}
      </div>
      <TableSkeleton selectable rows={10} cols={['w-24', 'w-36', 'w-28', 'w-20', 'w-28', 'w-24', 'w-16']} />
    </PageSkeleton>
  );
}

/** Mirrors OrderDetailView: header row, items + totals card, timeline, side cards. */
export function OrderDetailSkeleton() {
  return (
    <PageSkeleton label="Loading order">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4" aria-hidden>
        <div className="space-y-2.5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-52" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-6 w-32 rounded-full" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-28 rounded-xl" />
          <Skeleton className="h-10 w-44 rounded-xl" />
        </div>
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <CardSkeleton>
            <CardHeaderSkeleton />
            <div className="space-y-1 px-5 pb-4 pt-4">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="flex h-16 items-center gap-3">
                  <Skeleton className="h-12 w-12 rounded-xl" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-1/2" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                  <Skeleton className="h-3.5 w-16" />
                </div>
              ))}
            </div>
            <div className="space-y-2.5 border-t border-line px-5 py-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex justify-between">
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-3.5 w-16" />
                </div>
              ))}
            </div>
          </CardSkeleton>
          <CardSkeleton>
            <CardHeaderSkeleton />
            <div className="space-y-5 px-5 pb-6 pt-5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-32" />
                    <Skeleton className="h-3 w-44" />
                  </div>
                </div>
              ))}
            </div>
          </CardSkeleton>
        </div>
        <div className="space-y-6">
          {[0, 1, 2].map((i) => (
            <CardSkeleton key={i}>
              <CardHeaderSkeleton />
              <div className="space-y-3 px-5 pb-5 pt-4">
                <Skeleton className="h-3.5 w-3/4" />
                <Skeleton className="h-3.5 w-1/2" />
                <Skeleton className="h-3.5 w-2/3" />
              </div>
            </CardSkeleton>
          ))}
        </div>
      </div>
    </PageSkeleton>
  );
}
