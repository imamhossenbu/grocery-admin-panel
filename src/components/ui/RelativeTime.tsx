import { formatDateTime, formatRelative } from '@/lib/dates';

/**
 * "35 min ago" with the full date on hover. The server and the browser
 * render it a moment apart, so the text can legitimately differ by a
 * minute: suppressHydrationWarning covers exactly this element's text.
 */
export function RelativeTime({ value, className }: { value: string; className?: string }) {
  return (
    <time dateTime={value} title={formatDateTime(value)} className={className} suppressHydrationWarning>
      {formatRelative(value)}
    </time>
  );
}
