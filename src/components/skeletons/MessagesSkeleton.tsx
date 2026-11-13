import { Skeleton } from '@/components/ui/Skeleton';
import { CardSkeleton, PageSkeleton } from './blocks';

export function MessagesSkeleton() {
  return (
    <PageSkeleton label="Loading messages">
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(320px,420px)_1fr]" aria-hidden>
        <CardSkeleton>
          <div className="border-b border-line p-4">
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} className="flex gap-3 border-b border-[#edf4ef] p-4">
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-1/2" />
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
          ))}
        </CardSkeleton>
        <CardSkeleton className="hidden h-[360px] p-6 lg:block">
          <div className="flex gap-4">
            <Skeleton className="h-11 w-11 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-3.5 w-1/3" />
            </div>
          </div>
          <div className="mt-8 space-y-2.5">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </CardSkeleton>
      </div>
    </PageSkeleton>
  );
}
