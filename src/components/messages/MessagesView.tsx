'use client';

import React, { useEffect, useRef, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, Inbox, Mail, MailOpen, MailWarning, Phone, Reply } from 'lucide-react';
import type { ContactMessage, Paged } from '@/types/admin';
import { cn } from '@/lib/cn';
import { formatDateTime, formatRelative } from '@/lib/dates';
import { useUrlState } from '@/lib/client/use-url-state';
import { useLocalStorage } from '@/lib/client/use-local-storage';
import { postStoreAction, useStoreAction } from '@/lib/client/store-action';
import { Avatar, Card, Kbd } from '@/components/ui/Card';
import { SearchInput } from '@/components/ui/Input';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { buttonClass } from '@/components/ui/Button';

export function MessagesView({
  data,
  selected,
  filters,
}: {
  data: Paged<ContactMessage> & { readTracking: boolean };
  selected: ContactMessage | null;
  filters: { q: string; page: number; pageSize: number };
}) {
  const { set, href, isPending } = useUrlState();
  const router = useRouter();
  const [, startRefresh] = useTransition();
  const { run, busy } = useStoreAction();
  // Read state lives in contact_messages.read_at. Until that column is
  // migrated, fall back to a per-browser list.
  const tracked = data.readTracking;
  const [localRead, setLocalRead] = useLocalStorage<string[]>('fb-admin:read-messages', []);
  const localSet = new Set(localRead);
  const isUnread = (m: ContactMessage) => (tracked ? !m.readAt : !localSet.has(m.id));

  // Opening a message marks it read (once per message per visit).
  const marked = useRef(new Set<string>());
  useEffect(() => {
    if (!selected) return;
    if (!tracked) {
      if (!localRead.includes(selected.id)) setLocalRead([...localRead.slice(-500), selected.id]);
      return;
    }
    if (selected.readAt || marked.current.has(selected.id)) return;
    marked.current.add(selected.id);
    void postStoreAction('SET_MESSAGE_READ', { id: selected.id, read: true }).then((r) => {
      if (r.ok) startRefresh(() => router.refresh());
    });
  }, [selected, tracked, localRead, setLocalRead, router]);

  const markUnread = async (m: ContactMessage) => {
    if (!tracked) {
      setLocalRead(localRead.filter((id) => id !== m.id));
    } else {
      const out = await run('SET_MESSAGE_READ', { id: m.id, read: false }, { success: 'Marked as unread', error: 'Could not mark as unread' }, { refresh: false });
      if (!out.ok) return;
    }
    // Close the message so opening it again marks it read.
    marked.current.delete(m.id);
    set({ id: null }, { keepPage: true });
  };

  const list = (
    <Card className={cn('flex flex-col', selected && 'hidden lg:flex')}>
      <div className="border-b border-line p-4">
        <SearchInput
          data-page-search
          value={filters.q}
          debounce={300}
          onChange={(q) => set({ q, id: null })}
          placeholder="Search name, email, subject or text…"
          aria-label="Search messages"
          hint={<Kbd className="mr-1">/</Kbd>}
        />
      </div>
      {isPending ? (
        <ul aria-hidden className="divide-y divide-[#edf4ef]">
          {Array.from({ length: 6 }, (_, i) => (
            <li key={i} className="flex gap-3 p-4">
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-1/2" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            </li>
          ))}
        </ul>
      ) : data.rows.length === 0 ? (
        <EmptyState compact icon={<Inbox className="h-6 w-6" />} title={filters.q ? 'No messages match' : 'Inbox is empty'} description="Messages from the storefront contact form arrive here." />
      ) : (
        <ul className="divide-y divide-[#edf4ef]">
          {data.rows.map((m) => {
            const active = selected?.id === m.id;
            const unread = isUnread(m);
            return (
              <li key={m.id}>
                <Link
                  href={href({ id: m.id }, { keepPage: true })}
                  scroll={false}
                  aria-current={active ? 'true' : undefined}
                  className={cn('relative flex gap-3 p-4 transition-colors', active ? 'bg-mint' : 'hover:bg-mint-25')}
                >
                  {active && <motion.span layoutId="msg-active" className="absolute inset-y-0 left-0 w-[3px] bg-primary" />}
                  <Avatar name={m.name} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className={cn('truncate text-sm text-ink', unread ? 'font-semibold' : 'font-medium')}>{m.name}</span>
                      <span className="tabular shrink-0 text-[13px] text-muted">{formatRelative(m.createdAt)}</span>
                    </span>
                    <span className={cn('block truncate text-[13px]', unread ? 'font-medium text-ink' : 'text-muted')}>{m.subject || '(no subject)'}</span>
                    <span className="block truncate text-[13px] text-muted">{m.message}</span>
                  </span>
                  {unread && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <Pagination
        className="mt-auto border-t border-line"
        page={filters.page}
        pageSize={filters.pageSize}
        total={data.total}
        noun="messages"
        onPageChange={(page) => set({ page: page > 1 ? page : null, id: null }, { keepPage: true })}
      />
    </Card>
  );

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(320px,420px)_1fr]">
      {list}
      <div className={cn(!selected && 'hidden lg:block')}>
        <AnimatePresence mode="wait">
          {selected ? (
            <motion.div key={selected.id} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <Card className="p-6">
                <Link href={href({ id: null }, { keepPage: true })} scroll={false} className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted hover:text-primary lg:hidden">
                  <ArrowLeft className="h-4 w-4" /> All messages
                </Link>
                <div className="flex flex-wrap items-start gap-4 border-b border-line pb-5">
                  <Avatar name={selected.name} className="h-11 w-11" />
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-semibold text-ink">{selected.subject || '(no subject)'}</h2>
                    <p className="text-sm text-muted">
                      {selected.name} · <span className="tabular">{formatDateTime(selected.createdAt)}</span>
                    </p>
                  </div>
                </div>
                <p className="max-w-[75ch] whitespace-pre-wrap py-5 text-[15px] leading-relaxed text-ink">{selected.message}</p>
                <div className="flex flex-wrap items-center gap-2 border-t border-line pt-5">
                  <a href={`mailto:${selected.email}?subject=${encodeURIComponent(`Re: ${selected.subject || 'Your message to FreshBasket'}`)}`} className={buttonClass('primary', 'md')}>
                    <Reply className="h-4 w-4" /> Reply by email
                  </a>
                  {selected.phone && (
                    <a href={`tel:${selected.phone}`} className={buttonClass('outline', 'md')}>
                      <Phone className="h-4 w-4" /> Call {selected.phone}
                    </a>
                  )}
                  <button type="button" onClick={() => markUnread(selected)} disabled={busy} className={buttonClass('ghost', 'md')}>
                    <MailWarning className="h-4 w-4" /> Mark as unread
                  </button>
                  <span className="ml-auto inline-flex items-center gap-1.5 text-[13px] text-muted">
                    <Mail className="h-4 w-4" /> {selected.email}
                  </span>
                </div>
              </Card>
            </motion.div>
          ) : (
            <motion.div key="none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Card>
                <EmptyState icon={<MailOpen className="h-6 w-6" />} title="Select a message" description="Pick a message on the left to read it and reply." />
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
