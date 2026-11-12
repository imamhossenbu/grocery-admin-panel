import { Skeleton } from '@/components/ui/Skeleton';
import { PageSkeleton, TableSkeleton } from './blocks';

/** Header (title + optional button) and a table card, for the simpler list pages. */
export function SimpleListSkeleton({
  label,
  cols,
  button = true,
  tabs = 0,
  thumb = false,
  stats = 0,
}: {
  label: string;
  cols: string[];
  button?: boolean;
  tabs?: number;
  thumb?: boolean;
  stats?: number;
}) {
  return (
    <PageSkeleton label={label}>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4" aria-hidden>
        <div className="space-y-2.5">
          <Skeleton className="h-8 w-44" />
          <Skeleton className="h-4 w-96 max-w-[70vw]" />
        </div>
        {button && <Skeleton className="h-10 w-36 rounded-xl" />}
      </div>
      {stats > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4" aria-hidden>
          {Array.from({ length: stats }, (_, i) => (
            <div key={i} className="rounded-2xl border border-line bg-white p-5 shadow-soft">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="mt-2.5 h-7 w-20" />
            </div>
          ))}
        </div>
      )}
      {tabs > 0 && (
        <div className="mb-4 flex gap-4 border-b border-line" aria-hidden>
          {Array.from({ length: tabs }, (_, i) => (
            <div key={i} className="flex h-11 items-center gap-2 px-3">
              <Skeleton className="h-3.5 w-16" />
              <Skeleton className="h-4 w-7 rounded-full" />
            </div>
          ))}
        </div>
      )}
      <TableSkeleton rows={8} cols={cols} thumb={thumb} />
    </PageSkeleton>
  );
}
