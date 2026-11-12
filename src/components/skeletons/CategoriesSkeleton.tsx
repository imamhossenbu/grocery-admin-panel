import { Skeleton } from '@/components/ui/Skeleton';
import { PageSkeleton } from './blocks';

/** Mirrors CategoriesView: header, toolbar, collapsed top-level rows. */
export function CategoriesSkeleton({ header = true }: { header?: boolean }) {
  return (
    <PageSkeleton label="Loading categories">
      {header && (
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4" aria-hidden>
          <div className="space-y-2.5">
            <Skeleton className="h-8 w-44" />
            <Skeleton className="h-4 w-96 max-w-[70vw]" />
          </div>
          <Skeleton className="h-10 w-36 rounded-xl" />
        </div>
      )}
      <div className="rounded-2xl border border-line bg-white shadow-soft">
        <div className="flex flex-wrap items-center gap-2.5 border-b border-line p-4">
          <Skeleton className="h-10 w-full max-w-80 rounded-xl" />
          <Skeleton className="ml-auto h-9 w-28 rounded-xl" />
          <Skeleton className="h-9 w-28 rounded-xl" />
        </div>
        <div className="space-y-0.5 p-3">
          {Array.from({ length: 9 }, (_, i) => (
            <div key={i} className="flex min-h-14 items-center gap-3 px-2">
              <Skeleton className="h-7 w-7 rounded-lg" />
              <Skeleton className="h-10 w-10 rounded-xl" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-40" />
                <Skeleton className="h-3 w-56" />
              </div>
              <Skeleton className="hidden h-5 w-16 rounded-full sm:block" />
              <Skeleton className="hidden h-5 w-20 rounded-full sm:block" />
              <Skeleton className="h-8 w-20 rounded-lg" />
            </div>
          ))}
        </div>
        <div className="border-t border-line px-4 py-3">
          <Skeleton className="h-3.5 w-96 max-w-full" />
        </div>
      </div>
    </PageSkeleton>
  );
}
