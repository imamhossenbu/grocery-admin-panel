import { Skeleton } from '@/components/ui/Skeleton';
import { CardSkeleton, PageSkeleton, TableSkeleton } from './blocks';

export function ReviewsSkeleton() {
  return (
    <PageSkeleton label="Loading reviews">
      <div className="mb-6 grid gap-4 lg:grid-cols-3" aria-hidden>
        <CardSkeleton className="flex h-[150px] items-center gap-5 p-5">
          <div className="space-y-2">
            <Skeleton className="h-9 w-16" />
            <Skeleton className="h-5 w-28" />
          </div>
          <Skeleton className="h-4 w-40" />
        </CardSkeleton>
        <CardSkeleton className="h-[150px] space-y-3 p-5 lg:col-span-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-3 w-full" />
          ))}
        </CardSkeleton>
      </div>
      <div className="mb-4 flex gap-4 border-b border-line" aria-hidden>
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex h-11 items-center gap-2 px-3">
            <Skeleton className="h-3.5 w-16" />
            <Skeleton className="h-4 w-7 rounded-full" />
          </div>
        ))}
      </div>
      <TableSkeleton rows={8} cols={['w-72', 'w-40', 'w-28', 'w-20', 'w-20', 'w-28']} />
    </PageSkeleton>
  );
}
