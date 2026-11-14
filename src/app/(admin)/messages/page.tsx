import { Suspense } from 'react';
import type { Metadata } from 'next';
import { requireAdminWith } from '@/lib/auth';
import { getMessage, listMessages } from '@/lib/cached-queries';
import { one, parseSimpleList, type RawSearchParams } from '@/lib/filters';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadError } from '@/components/ui/LoadError';
import { safeLoad } from '@/lib/safe-load';
import { MessagesView } from '@/components/messages/MessagesView';
import { MessagesSkeleton } from '@/components/skeletons/MessagesSkeleton';

export const metadata: Metadata = { title: 'Messages' };

async function MessagesContent({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const sp = await searchParams;
  const filters = parseSimpleList(sp);
  const id = one(sp, 'id');
  const [, r] = await requireAdminWith(() => safeLoad(() => Promise.all([listMessages(filters), id ? getMessage(id) : Promise.resolve(null)])));
  if (!r.ok) return <LoadError error={r.error} />;
  return <MessagesView data={r.data[0]} selected={r.data[1]} filters={filters} />;
}

export default function MessagesPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  return (
    <>
      <PageHeader title="Messages" description="Questions and feedback sent through the storefront contact form." />
      <Suspense fallback={<MessagesSkeleton />}>
        <MessagesContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}
