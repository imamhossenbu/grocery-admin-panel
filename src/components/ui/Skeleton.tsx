import { cn } from '@/lib/cn';

/** Shimmering placeholder block. Size it exactly like the content it stands in for. */
export function Skeleton({ className = '', dark = false }: { className?: string; dark?: boolean }) {
  return <span aria-hidden className={cn('block rounded-lg', dark ? 'skeleton-dark' : 'skeleton', className)} />;
}

/** Text line placeholder whose height matches a line of text of that size. */
export function SkeletonText({ className = '', size = 'sm' }: { className?: string; size?: 'xs' | 'sm' | 'base' | 'lg' | '2xl' }) {
  const h = { xs: 'h-3', sm: 'h-3.5', base: 'h-4', lg: 'h-5', '2xl': 'h-7' }[size];
  return <Skeleton className={cn(h, 'rounded-md', className)} />;
}

/** Wraps a loading region so assistive tech hears one "Loading" instead of noise. */
export function LoadingRegion({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}
