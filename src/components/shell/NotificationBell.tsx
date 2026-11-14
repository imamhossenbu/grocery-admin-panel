'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Bell, CreditCard, Banknote, Inbox } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatBDT } from '@/lib/format';
import { STATUS_META } from '@/lib/order-meta';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/Popover';
import { Tooltip } from '@/components/ui/Tooltip';
import { Skeleton } from '@/components/ui/Skeleton';
import { usePulse } from './PulseProvider';
import { RelativeTime } from '@/components/ui/RelativeTime';

export function NotificationBell() {
  const { pulse, unread, ring, markSeen } = usePulse();
  const [open, setOpen] = useState(false);

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) markSeen();
      }}
    >
      <Tooltip content="New orders">
        <PopoverTrigger
          aria-label={unread ? `Notifications: ${unread} new orders` : 'Notifications'}
          className="relative grid h-10 w-10 cursor-pointer place-items-center rounded-xl text-muted outline-none transition hover:bg-mint hover:text-ink focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-95 data-[state=open]:bg-mint data-[state=open]:text-ink"
        >
          <Bell key={ring} className={cn('h-5 w-5', ring > 0 && 'fb-wiggle')} />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-[#e0577a] px-1 text-[11px] font-bold leading-none text-white ring-2 ring-white">
              <span aria-hidden className="fb-ping absolute inset-0 rounded-full bg-[#e0577a]/60" />
              <span className="relative">{unread > 9 ? '9+' : unread}</span>
            </span>
          )}
        </PopoverTrigger>
      </Tooltip>
      <PopoverContent align="end" className="w-[min(380px,calc(100vw-24px))] p-0">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <div>
            <p className="text-[15px] font-semibold text-ink">Latest orders</p>
            <p className="text-[13px] text-muted">
              {pulse ? `${pulse.pendingOrders} waiting for confirmation` : 'Loading…'}
            </p>
          </div>
          <Link href="/orders?status=Pending" onClick={() => setOpen(false)} className="rounded-lg px-2 py-1 text-[13px] font-semibold text-primary-600 hover:bg-mint">
            Pending
          </Link>
        </div>
        <ul className="max-h-[360px] overflow-y-auto p-1.5">
          {!pulse &&
            Array.from({ length: 4 }, (_, i) => (
              <li key={i} className="flex items-center gap-3 px-2.5 py-2.5">
                <Skeleton className="h-9 w-9 rounded-xl" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-1/2" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </li>
            ))}
          {pulse && pulse.latestOrders.length === 0 && (
            <li className="flex flex-col items-center gap-2 px-4 py-10 text-center text-sm text-muted">
              <Inbox className="h-6 w-6 text-primary" />
              No orders yet.
            </li>
          )}
          {pulse?.latestOrders.map((o) => {
            const isNew = Date.parse(o.createdAt) > 0 && unread > 0 && pulse.latestOrders.indexOf(o) < unread;
            return (
              <li key={o.id}>
                <Link
                  href={`/orders/${encodeURIComponent(o.id)}`}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-2.5 py-2.5 transition hover:bg-mint-50"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-mint text-primary">
                    {o.paymentMethod === 'cod' ? <Banknote className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 text-sm font-semibold text-ink">
                      <span className="tabular">{o.id}</span>
                      {isNew && <span className="h-2 w-2 rounded-full bg-[#e0577a]" aria-label="new" />}
                    </span>
                    <span className="block truncate text-[13px] text-muted">
                      {o.name} · <span className="tabular">{formatBDT(o.total)}</span>
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-xs font-semibold" style={{ color: STATUS_META[o.status].color }}>
                      {STATUS_META[o.status].short}
                    </span>
                    <span className="block text-[13px] text-subtle">{<RelativeTime value={o.createdAt} />}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="border-t border-line p-2">
          <Link href="/orders" onClick={() => setOpen(false)} className="block rounded-lg py-2 text-center text-[13px] font-semibold text-primary-600 hover:bg-mint">
            View all orders
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
