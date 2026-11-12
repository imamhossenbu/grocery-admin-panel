'use client';

import { useCallback, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { redirectToLogin } from '@/lib/redirect-to-login';
import { useToast } from '@/components/ui/Toast';

export interface ActionOutcome<R = { id?: string; count?: number } | null> {
  ok: boolean;
  result?: R;
  message?: string;
}

/** POST /api/store { action, payload }. Never throws. */
export async function postStoreAction(action: string, payload: unknown): Promise<ActionOutcome & { status: number; code?: string }> {
  try {
    const res = await fetch('/api/store', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, payload }),
    });
    const body = await res.json().catch(() => null);
    if (res.ok) return { ok: true, status: res.status, result: body?.result ?? null };
    return {
      ok: false,
      status: res.status,
      code: typeof body?.error === 'string' ? body.error : undefined,
      message: typeof body?.message === 'string' ? body.message : `The server answered with status ${res.status}.`,
    };
  } catch {
    return { ok: false, status: 0, message: 'Could not reach the admin server. Check your connection and try again.' };
  }
}

/**
 * Runs an admin action, shows a toast, and refreshes the server-rendered
 * data on success. `pending` is true while the request runs; `refreshing`
 * while the page re-renders with fresh data.
 */
export function useStoreAction() {
  const router = useRouter();
  const toast = useToast();
  const [pending, setPending] = useState(false);
  const [refreshing, startRefresh] = useTransition();

  const run = useCallback(
    async (
      action: string,
      payload: unknown,
      messages: { success?: string; successDetail?: string; error?: string } = {},
      opts: { refresh?: boolean } = {}
    ): Promise<ActionOutcome> => {
      setPending(true);
      const out = await postStoreAction(action, payload);
      setPending(false);
      if (out.status === 401 || out.status === 403) {
        toast.error('Session expired', 'Please sign in again.');
        redirectToLogin();
        return out;
      }
      if (!out.ok) {
        toast.error(messages.error ?? 'Could not save', out.message);
        return out;
      }
      if (messages.success) toast.success(messages.success, messages.successDetail);
      if (opts.refresh !== false) startRefresh(() => router.refresh());
      return out;
    },
    [router, toast]
  );

  return { run, pending, refreshing, busy: pending || refreshing };
}
