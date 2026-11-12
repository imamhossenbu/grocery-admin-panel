import { Suspense } from 'react';
import type { Metadata } from 'next';
import { requireAdminPage } from '@/lib/auth';
import { listSubscribers } from '@/lib/admin-queries';
import { parseSimpleList, type RawSearchParams } from '@/lib/filters';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadError } from '@/components/ui/LoadError';
import { safeLoad } from '@/lib/safe-load';
import { NewsletterView } from '@/components/newsletter/NewsletterView';
import { NewsletterSkeleton } from '@/components/skeletons/SettingsSkeleton';

export const metadata: Metadata = { title: 'Newsletter' };

async function NewsletterContent({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  await requireAdminPage();
  const filters = parseSimpleList(await searchParams);
  const r = await safeLoad(() => listSubscribers(filters));
  if (!r.ok) return <LoadError error={r.error} />;
  return <NewsletterView data={r.data} filters={filters} />;
}

export default function NewsletterPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  return (
    <>
      <PageHeader title="Newsletter" description="Email addresses collected by the storefront sign-up form." />
      <Suspense fallback={<NewsletterSkeleton />}>
        <NewsletterContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}
