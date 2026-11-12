'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import * as RD from '@radix-ui/react-dialog';
import { AnimatePresence, motion } from 'motion/react';
import { dialogVariants, overlayVariants } from '@/components/ui/motion';
import { CornerDownLeft, Download, Keyboard, Package, PanelLeft, Plus, Search, ShoppingBag, TicketPercent, User } from 'lucide-react';
import type { SearchResults } from '@/types/admin';
import { formatBDT } from '@/lib/format';
import { formatRelative } from '@/lib/dates';
import { STATUS_META } from '@/lib/order-meta';
import { Kbd, Thumb } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { NAV_ITEMS } from './nav';
import { toggleSidebar } from './sidebar-state';

const itemClass =
  'flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm text-ink outline-none transition-colors data-[selected=true]:bg-mint data-[selected=true]:text-primary-600';
const groupClass =
  '[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted p-1.5';

function matches(text: string, q: string) {
  return !q || text.toLowerCase().includes(q.toLowerCase());
}

/** ⌘K: jump to pages, run actions, find orders (id/phone/name), products and customers. */
export function CommandPalette({ open, onOpenChange, onShowShortcuts }: { open: boolean; onOpenChange: (o: boolean) => void; onShowShortcuts: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const ctrl = new AbortController();
    const t = window.setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal, cache: 'no-store' });
        if (res.ok) setResults((await res.json()) as SearchResults);
      } catch {
        // aborted / offline
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 220);
    return () => {
      ctrl.abort();
      window.clearTimeout(t);
    };
  }, [query]);

  const go = (href: string) => {
    onOpenChange(false);
    setQuery('');
    setResults(null);
    router.push(href);
  };

  const q = query.trim();
  const remote = q.length >= 2 ? results : null;
  const pages = NAV_ITEMS.filter((i) => matches(`${i.label} ${i.keywords ?? ''}`, q));
  const actions = [
    { label: 'Add a new product', icon: Plus, run: () => go('/products/new'), k: 'new product create' },
    { label: 'Create a coupon', icon: TicketPercent, run: () => go('/coupons?new=1'), k: 'new coupon discount' },
    { label: 'Pending orders', icon: ShoppingBag, run: () => go('/orders?status=Pending'), k: 'pending orders confirm' },
    { label: 'Low-stock products', icon: Package, run: () => go('/products?stock=low'), k: 'low stock inventory' },
    {
      label: 'Export orders (CSV)',
      icon: Download,
      run: () => {
        onOpenChange(false);
        window.location.assign('/api/admin/orders/export');
      },
      k: 'export csv download',
    },
    { label: 'Toggle sidebar', icon: PanelLeft, run: () => { onOpenChange(false); toggleSidebar(); }, k: 'sidebar collapse expand' },
    { label: 'Keyboard shortcuts', icon: Keyboard, run: () => { onOpenChange(false); onShowShortcuts(); }, k: 'help keys shortcuts' },
  ].filter((a) => matches(`${a.label} ${a.k}`, q));

  return (
    <RD.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
      {open && (
      <RD.Portal forceMount>
        <RD.Overlay forceMount asChild>
          <motion.div variants={overlayVariants} initial="initial" animate="animate" exit="exit" className="fixed inset-0 z-[85] bg-[#071a10]/50 backdrop-blur-[3px]" />
        </RD.Overlay>
        <RD.Content forceMount asChild aria-describedby={undefined}>
          <motion.div
            variants={dialogVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="fixed left-1/2 top-[12vh] z-[86] w-[min(640px,calc(100vw-24px))] -translate-x-1/2 overflow-hidden rounded-3xl border border-line bg-white shadow-pop outline-none"
          >
          <RD.Title className="sr-only">Command palette</RD.Title>
          <Command shouldFilter={false} loop label="Command palette">
            <div className="flex items-center gap-3 border-b border-line px-4">
              <Search className="h-5 w-5 shrink-0 text-muted" />
              <Command.Input
                value={query}
                onValueChange={setQuery}
                placeholder="Search orders by ID or phone, products, customers, pages…"
                className="h-14 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-[#7e9688]"
              />
              <Kbd>Esc</Kbd>
            </div>
            <Command.List className="max-h-[min(460px,60vh)] overflow-y-auto">
              {loading && !remote && (
                <div className="space-y-2 p-3" aria-hidden>
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="flex items-center gap-3 px-2 py-1.5">
                      <Skeleton className="h-9 w-9 rounded-xl" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-3.5 w-1/3" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <Command.Empty className="px-4 py-10 text-center text-sm text-muted">
                {q.length >= 2 && loading ? 'Searching…' : `Nothing found for “${q}”.`}
              </Command.Empty>

              {remote && remote.orders.length > 0 && (
                <Command.Group heading="Orders" className={groupClass}>
                  {remote.orders.map((o) => (
                    <Command.Item key={o.id} value={`order-${o.id}`} onSelect={() => go(`/orders/${encodeURIComponent(o.id)}`)} className={itemClass}>
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-mint text-primary">
                        <ShoppingBag className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="tabular block font-semibold">{o.id}</span>
                        <span className="block truncate text-[13px] text-muted">
                          {o.name} · <span className="tabular">{o.phone}</span> · {formatRelative(o.createdAt)}
                        </span>
                      </span>
                      <span className="text-right">
                        <span className="tabular block font-semibold">{formatBDT(o.total)}</span>
                        <span className="block text-xs font-semibold" style={{ color: STATUS_META[o.status].color }}>
                          {o.status}
                        </span>
                      </span>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}
              {remote && remote.products.length > 0 && (
                <Command.Group heading="Products" className={groupClass}>
                  {remote.products.map((p) => (
                    <Command.Item key={p.id} value={`product-${p.id}`} onSelect={() => go(`/products/${encodeURIComponent(p.id)}`)} className={itemClass}>
                      <Thumb src={p.image} className="h-9 w-9" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{p.name}</span>
                        <span className="block text-[13px] text-muted">
                          <span className="tabular">{p.stock}</span> in stock{p.active ? '' : ' · hidden'}
                        </span>
                      </span>
                      <span className="tabular font-semibold">{formatBDT(p.price)}</span>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}
              {remote && remote.customers.length > 0 && (
                <Command.Group heading="Customers" className={groupClass}>
                  {remote.customers.map((c) => (
                    <Command.Item key={c.id} value={`customer-${c.id}`} onSelect={() => go(`/customers/${c.id}`)} className={itemClass}>
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#ecf2fd] text-[#24539f]">
                        <User className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{c.name}</span>
                        <span className="tabular block text-[13px] text-muted">{c.phone || 'No phone'}</span>
                      </span>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}

              {pages.length > 0 && (
                <Command.Group heading="Go to" className={groupClass}>
                  {pages.map((p) => (
                    <Command.Item key={p.href} value={`page-${p.href}`} onSelect={() => go(p.href)} className={itemClass}>
                      <p.icon className="h-[18px] w-[18px] text-muted" />
                      <span className="flex-1">{p.label}</span>
                      <span className="flex gap-1">
                        <Kbd>G</Kbd>
                        <Kbd>{p.key.toUpperCase()}</Kbd>
                      </span>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}
              {actions.length > 0 && (
                <Command.Group heading="Actions" className={groupClass}>
                  {actions.map((a) => (
                    <Command.Item key={a.label} value={`action-${a.label}`} onSelect={a.run} className={itemClass}>
                      <a.icon className="h-[18px] w-[18px] text-muted" />
                      <span className="flex-1">{a.label}</span>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}
            </Command.List>
            <div className="flex items-center gap-4 border-t border-line bg-mint-25 px-4 py-2.5 text-xs text-muted">
              <span className="flex items-center gap-1.5">
                <Kbd>↑</Kbd>
                <Kbd>↓</Kbd> move
              </span>
              <span className="flex items-center gap-1.5">
                <Kbd>
                  <CornerDownLeft className="h-3 w-3" />
                </Kbd>
                open
              </span>
              <span className="ml-auto hidden sm:inline">Type 2+ characters to search the store</span>
            </div>
          </Command>
          </motion.div>
        </RD.Content>
      </RD.Portal>
      )}
      </AnimatePresence>
    </RD.Root>
  );
}
