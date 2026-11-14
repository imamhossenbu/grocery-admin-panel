import { Suspense } from 'react';
import type { Metadata } from 'next';
import { requireAdminWith } from '@/lib/auth';
import { listReviews, warmReviewTabs } from '@/lib/cached-queries';
import { after } from 'next/server';
import { parseReviewFilters, type RawSearchParams } from '@/lib/filters';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadError } from '@/components/ui/LoadError';
import { safeLoad } from '@/lib/safe-load';
import { ReviewsView } from '@/components/reviews/ReviewsView';
import { ReviewsSkeleton } from '@/components/skeletons/ReviewsSkeleton';

export const metadata: Metadata = { title: 'Reviews' };

async function ReviewsContent({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const filters = parseReviewFilters(await searchParams);
  const [, r] = await requireAdminWith(() => safeLoad(() => listReviews(filters)));
  if (!r.ok) return <LoadError error={r.error} />;
  // Load the other tabs into the cache after this response is sent.
  after(() => warmReviewTabs(filters));
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
