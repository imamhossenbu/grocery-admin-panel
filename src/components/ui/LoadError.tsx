import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { StoreError } from '@/lib/supabase-db';

/**
 * Server-side load failure card: explains what went wrong instead of
 * showing empty data as if it were live. Server component.
 */
export function LoadError({ error, title }: { error: unknown; title?: string }) {
  const known = error instanceof StoreError;
  if (!known) console.error('[admin] page load failed:', error);
  const code = known ? error.code : 'INTERNAL_ERROR';
  const message = known ? error.message : 'Something went wrong while loading this page. Please try again.';
  return (
    <div role="alert" className="fb-fade-in flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-amber-950">
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
      <div className="space-y-1">
        <p className="text-[15px] font-semibold">
          {title ?? (code === 'DATABASE_NOT_READY' ? 'The database is not set up yet' : 'Could not load live data')}
        </p>
        <p className="text-sm">{message}</p>
        <p className="text-[13px] text-amber-900">Nothing here is shown as live until this is fixed. Reload the page to try again. ({code})</p>
      </div>
    </div>
  );
}
