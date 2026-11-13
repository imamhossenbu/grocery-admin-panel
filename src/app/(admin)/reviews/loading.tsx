import { PageHeader } from '@/components/ui/PageHeader';
import { ReviewsSkeleton } from '@/components/skeletons/ReviewsSkeleton';

export default function Loading() {
  return (
    <>
      <PageHeader title="Reviews" description="Approve or hide product reviews. Only visible reviews count toward a product’s rating." />
      <ReviewsSkeleton />
    </>
  );
}
