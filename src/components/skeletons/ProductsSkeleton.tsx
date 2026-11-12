import { Skeleton } from '@/components/ui/Skeleton';
import { CardHeaderSkeleton, CardSkeleton, PageSkeleton, TableSkeleton } from './blocks';

export function ProductsSkeleton() {
  return (
    <PageSkeleton label="Loading products">
      <div className="mb-4 flex gap-4 border-b border-line" aria-hidden>
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex h-11 items-center gap-2 px-3">
            <Skeleton className="h-3.5 w-16" />
            <Skeleton className="h-4 w-7 rounded-full" />
          </div>
        ))}
      </div>
      <TableSkeleton selectable thumb rows={10} cols={['w-56', 'w-32', 'w-16', 'w-28', 'w-12', 'w-11', 'w-11']} />
    </PageSkeleton>
  );
}

function FieldSkeleton({ wide = false }: { wide?: boolean }) {
  return (
    <div className="space-y-2">
      <Skeleton className="h-3.5 w-24" />
      <Skeleton className={wide ? 'h-24 w-full rounded-xl' : 'h-10 w-full rounded-xl'} />
    </div>
  );
}

/** Mirrors ProductForm: header, four main cards, two side cards. */
export function ProductFormSkeleton() {
  return (
    <PageSkeleton label="Loading product">
      <div className="mb-6 space-y-2.5" aria-hidden>
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <CardSkeleton>
            <CardHeaderSkeleton />
            <div className="space-y-5 p-5">
              <FieldSkeleton />
              <FieldSkeleton wide />
            </div>
          </CardSkeleton>
          <CardSkeleton>
            <CardHeaderSkeleton />
            <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-3 lg:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="aspect-square w-full rounded-2xl" />
              ))}
            </div>
          </CardSkeleton>
          <CardSkeleton>
            <CardHeaderSkeleton />
            <div className="grid gap-5 p-5 sm:grid-cols-2">
              {[0, 1, 2, 3, 4].map((i) => (
                <FieldSkeleton key={i} />
              ))}
            </div>
          </CardSkeleton>
        </div>
        <div className="space-y-6">
          <CardSkeleton>
            <CardHeaderSkeleton />
            <div className="space-y-4 p-5">
              {[0, 1].map((i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="space-y-1.5">
                    <Skeleton className="h-3.5 w-32" />
                    <Skeleton className="h-3 w-44" />
                  </div>
                  <Skeleton className="h-6 w-11 rounded-full" />
                </div>
              ))}
            </div>
          </CardSkeleton>
          <CardSkeleton>
            <CardHeaderSkeleton />
            <div className="space-y-5 p-5">
              <FieldSkeleton />
              <FieldSkeleton />
            </div>
          </CardSkeleton>
        </div>
      </div>
    </PageSkeleton>
  );
}
