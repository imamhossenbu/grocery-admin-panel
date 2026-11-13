'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { Pulse } from '@/types/admin';
import { redirectToLogin } from '@/lib/redirect-to-login';
import { formatBDT } from '@/lib/format';
import { useToast } from '@/components/ui/Toast';

const POLL_MS = 30_000;
const SEEN_KEY = 'fb-admin:bell-seen';

interface PulseState {
  pulse: Pulse | null;
  /** Orders newer than the last time the bell was opened. */
  unread: number;
  /** Bumps when a new order arrives (drives the bell wiggle). */
  ring: number;
  markSeen: () => void;
  refresh: () => void;
}

const PulseContext = createContext<PulseState>({
  pulse: null,
  unread: 0,
  ring: 0,
  markSeen: () => undefined,
  refresh: () => undefined,
});

export const usePulse = () => useContext(PulseContext);

function readSeen(): number {
  try {
    return Number(localStorage.getItem(SEEN_KEY)) || 0;
  } catch {
    return 0;
  }
}

/**
 * Polls /api/admin/pulse every 30 s (and when the tab regains focus) for
 * sidebar badges and the notification bell. Announces new orders with a
 * toast. Disabled in `preview` mode (UI kit page).
 */
export function PulseProvider({ children, preview = false, initial = null }: { children: React.ReactNode; preview?: boolean; initial?: Pulse | null }) {
  const [pulse, setPulse] = useState<Pulse | null>(initial);
  const [seenAt, setSeenAt] = useState(0);
  const [ring, setRing] = useState(0);
  const newest = useRef<number | null>(null);
  const toast = useToast();

  const load = useCallback(async () => {
    if (preview || document.visibilityState === 'hidden') return;
    try {
      const res = await fetch('/api/admin/pulse', { cache: 'no-store' });
      if (res.status === 401 || res.status === 403) return redirectToLogin();
      if (!res.ok) return;
      const data = (await res.json()) as Pulse;
      const latest = data.latestOrders[0] ? Date.parse(data.latestOrders[0].createdAt) : 0;
      if (newest.current !== null && latest > newest.current) {
        const fresh = data.latestOrders.filter((o) => Date.parse(o.createdAt) > newest.current!);
        setRing((r) => r + 1);
        const first = fresh[0];
        toast.order(
          fresh.length === 1 ? `New order ${first.id}` : `${fresh.length} new orders`,
          fresh.length === 1 ? `${first.name} · ${formatBDT(first.total)}` : 'Open the Orders page to process them.',
          { action: { label: fresh.length === 1 ? 'View order' : 'View orders', href: fresh.length === 1 ? `/orders/${encodeURIComponent(first.id)}` : '/orders?status=Pending' } }
        );
      }
      newest.current = Math.max(newest.current ?? 0, latest);
      setPulse(data);
    } catch {
      // Offline for a moment: keep the last known values.
    }
  }, [preview, toast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading a browser-only value once on mount
    setSeenAt(readSeen());
    // Initial fetch, then poll; state is set only after each request resolves.
    load();
    const t = window.setInterval(load, POLL_MS);
    const onVis = () => document.visibilityState === 'visible' && load();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearInterval(t);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [load]);

  const markSeen = useCallback(() => {
    const now = Date.now();
    setSeenAt(now);
    try {
      localStorage.setItem(SEEN_KEY, String(now));
    } catch {
      // ignore
    }
  }, []);

  const unread = pulse ? pulse.latestOrders.filter((o) => Date.parse(o.createdAt) > seenAt).length : 0;

  return <PulseContext value={{ pulse, unread, ring, markSeen, refresh: load }}>{children}</PulseContext>;
}
