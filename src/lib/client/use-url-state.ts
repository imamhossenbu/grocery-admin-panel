'use client';

import { useCallback, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

type Patch = Record<string, string | number | boolean | string[] | null | undefined>;

/**
 * Filters live in the URL. `set()` merges a patch into the current search
 * params (dropping empty values and resetting `page` unless it is part of
 * the patch) and navigates inside a transition, so `isPending` can drive
 * skeleton rows while the server renders the new result.
 */
export function useUrlState() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const href = useCallback(
    (patch: Patch, { keepPage = false }: { keepPage?: boolean } = {}) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(patch)) {
        const value = Array.isArray(v) ? v.join(',') : v === true ? '1' : v === false ? '' : v === null || v === undefined ? '' : String(v);
        if (value) next.set(k, value);
        else next.delete(k);
      }
      if (!keepPage && !('page' in patch)) next.delete('page');
      const qs = next.toString();
      return qs ? `${pathname}?${qs}` : pathname;
    },
    [params, pathname]
  );

  const set = useCallback(
    (patch: Patch, opts?: { keepPage?: boolean }) => {
      const url = href(patch, opts);
      startTransition(() => router.replace(url, { scroll: false }));
    },
    [href, router]
  );

  const reset = useCallback(
    (keep: string[] = []) => {
      const next = new URLSearchParams();
      for (const k of keep) {
        const v = params.get(k);
        if (v) next.set(k, v);
      }
      const qs = next.toString();
      startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
    },
    [params, pathname, router]
  );

  return { params, set, reset, href, isPending };
}
