import { Skeleton } from '@/components/ui/Skeleton';
import { CardHeaderSkeleton, CardSkeleton, PageSkeleton, TableSkeleton } from './blocks';

export function CustomersSkeleton() {
  return (
    <PageSkeleton label="Loading customers">
      <div className="mb-4 flex gap-4 border-b border-line" aria-hidden>
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex h-11 items-center gap-2 px-3">
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-4 w-7 rounded-full" />
          </div>
        ))}
      </div>
      <TableSkeleton rows={10} cols={['w-48', 'w-28', 'w-28', 'w-12', 'w-20', 'w-20', 'w-20']} />
    </PageSkeleton>
  );
}

export function CustomerDetailSkeleton() {
  return (
    <PageSkeleton label="Loading customer">
      <div aria-hidden>
        <Skeleton className="mb-3 h-4 w-28" />
        <div className="mb-6 flex items-center gap-4">
          <Skeleton className="h-14 w-14 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-4 w-96 max-w-full" />
          </div>
        </div>
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <CardSkeleton key={i} className="h-[94px] p-5">
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="mt-2.5 h-7 w-24" />
            </CardSkeleton>
          ))}
        </div>
        <div className="grid gap-6 xl:grid-cols-3">
          <div className="space-y-6 xl:col-span-2">
            <TableSkeleton rows={5} toolbar={false} cols={['w-24', 'w-32', 'w-24', 'w-20', 'w-16']} footer={false} />
            <CardSkeleton>
              <CardHeaderSkeleton />
              <div className="space-y-4 p-5">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </CardSkeleton>
          </div>
          <CardSkeleton>
            <CardHeaderSkeleton />
            <div className="space-y-4 p-5">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          </CardSkeleton>
        </div>
      </div>
    </PageSkeleton>
  );
}
