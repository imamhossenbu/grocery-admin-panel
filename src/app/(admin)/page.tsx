import { Suspense } from 'react';
import type { Metadata } from 'next';
import { requireAdminPage } from '@/lib/auth';
import { getOverview } from '@/lib/admin-queries';
import { one, type RawSearchParams } from '@/lib/filters';
import { PageHeader } from '@/components/ui/PageHeader';
import { OverviewView } from '@/components/overview/OverviewView';
import { OverviewSkeleton } from '@/components/skeletons/OverviewSkeleton';
import { LoadError } from '@/components/ui/LoadError';
import { safeLoad } from '@/lib/safe-load';

export const metadata: Metadata = { title: 'Overview' };

async function OverviewContent({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  await requireAdminPage();
  const sp = await searchParams;
  const r = await safeLoad(() => getOverview({ range: one(sp, 'range'), from: one(sp, 'from'), to: one(sp, 'to') }));
  if (!r.ok) return <LoadError error={r.error} />;
  return <OverviewView data={r.data} />;
}

export default function OverviewPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  return (
    <>
      <PageHeader title="Overview" description="How the store is doing: sales, orders, customers and stock at a glance." />
      <Suspense fallback={<OverviewSkeleton />}>
        <OverviewContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}
