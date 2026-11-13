import { Suspense } from 'react';
import type { Metadata } from 'next';
import { requireAdminPage } from '@/lib/auth';
import { listReviews } from '@/lib/admin-queries';
import { parseReviewFilters, type RawSearchParams } from '@/lib/filters';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadError } from '@/components/ui/LoadError';
import { safeLoad } from '@/lib/safe-load';
import { ReviewsView } from '@/components/reviews/ReviewsView';
import { ReviewsSkeleton } from '@/components/skeletons/ReviewsSkeleton';

export const metadata: Metadata = { title: 'Reviews' };

async function ReviewsContent({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  await requireAdminPage();
  const filters = parseReviewFilters(await searchParams);
  const r = await safeLoad(() => listReviews(filters));
  if (!r.ok) return <LoadError error={r.error} />;
  return <ReviewsView data={r.data} filters={filters} />;
}

export default function ReviewsPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  return (
    <>
      <PageHeader title="Reviews" description="Approve or hide product reviews. Only visible reviews count toward a product’s rating." />
      <Suspense fallback={<ReviewsSkeleton />}>
        <ReviewsContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}
