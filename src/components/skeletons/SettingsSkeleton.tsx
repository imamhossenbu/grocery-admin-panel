import { Skeleton } from '@/components/ui/Skeleton';
import { CardHeaderSkeleton, CardSkeleton, PageSkeleton, TableSkeleton } from './blocks';

export function NewsletterSkeleton() {
  return (
    <PageSkeleton label="Loading subscribers">
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4" aria-hidden>
        {[0, 1].map((i) => (
          <CardSkeleton key={i} className="p-5">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="mt-2.5 h-7 w-16" />
          </CardSkeleton>
        ))}
      </div>
      <TableSkeleton rows={10} cols={['w-64', 'w-48']} />
    </PageSkeleton>
  );
}

function Rows({ n }: { n: number }) {
  return (
    <div className="divide-y divide-[#edf4ef] px-5 pb-2 pt-2">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="grid gap-4 py-3 sm:grid-cols-[200px_1fr]">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-3.5 w-2/3" />
        </div>
      ))}
    </div>
  );
}

export function SettingsSkeleton() {
  return (
    <PageSkeleton label="Loading settings">
      <div className="grid items-start gap-6 xl:grid-cols-3" aria-hidden>
        <div className="space-y-6 xl:col-span-2">
          <CardSkeleton>
            <CardHeaderSkeleton />
            <Rows n={5} />
          </CardSkeleton>
          <CardSkeleton>
            <CardHeaderSkeleton />
            <Rows n={3} />
          </CardSkeleton>
        </div>
        <div className="space-y-6">
          <CardSkeleton>
            <CardHeaderSkeleton />
            <div className="space-y-3 p-5">
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-4/5" />
              <Skeleton className="h-10 w-52 rounded-xl" />
            </div>
          </CardSkeleton>
        </div>
      </div>
    </PageSkeleton>
  );
}

/** One settings section (the side nav is part of the layout, not this). */
export function SettingsSectionSkeleton({ cards = 1 }: { cards?: number }) {
  return (
    <div className="space-y-6" aria-hidden>
      {Array.from({ length: cards }, (_, i) => (
        <CardSkeleton key={i}>
          <CardHeaderSkeleton />
          <Rows n={i === 0 ? 5 : 3} />
        </CardSkeleton>
      ))}
    </div>
  );
}
