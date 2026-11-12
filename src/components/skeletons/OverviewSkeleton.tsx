import { Skeleton } from '@/components/ui/Skeleton';
import { CardHeaderSkeleton, CardSkeleton, KpiCardSkeleton, PageSkeleton } from './blocks';

function ListRows({ n, thumb = true }: { n: number; thumb?: boolean }) {
  return (
    <ul className="space-y-1 px-5 pb-5 pt-4">
      {Array.from({ length: n }, (_, i) => (
        <li key={i} className="flex h-12 items-center gap-3">
          {thumb && <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />}
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-3.5 w-14" />
        </li>
      ))}
    </ul>
  );
}

/** Mirrors OverviewView: toolbar, 5 KPIs, chart row, three lists, orders + activity. */
export function OverviewBodySkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-10 w-80 max-w-full rounded-xl" />
        <Skeleton className="h-10 w-44 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <KpiCardSkeleton key={i} />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <CardSkeleton className="h-[440px] xl:col-span-2">
          <CardHeaderSkeleton action />
          <div className="px-5 pt-6">
            <Skeleton className="h-[300px] w-full rounded-xl" />
          </div>
        </CardSkeleton>
        <CardSkeleton className="h-[420px]">
          <CardHeaderSkeleton />
          <div className="flex flex-col items-center gap-5 px-5 pt-6">
            <Skeleton className="h-[170px] w-[170px] rounded-full" />
            <div className="grid w-full grid-cols-2 gap-2.5">
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </div>
          </div>
        </CardSkeleton>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <CardSkeleton key={i} className="h-[392px]">
            <CardHeaderSkeleton />
            <ListRows n={5} thumb={i !== 1} />
          </CardSkeleton>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <CardSkeleton className="h-[470px] xl:col-span-2">
          <CardHeaderSkeleton action />
          <ListRows n={6} />
        </CardSkeleton>
        <CardSkeleton className="h-[470px]">
          <CardHeaderSkeleton />
          <ListRows n={6} />
        </CardSkeleton>
      </div>
    </div>
  );
}

export function OverviewSkeleton() {
  return (
    <PageSkeleton label="Loading the overview">
      <OverviewBodySkeleton />
    </PageSkeleton>
  );
}
