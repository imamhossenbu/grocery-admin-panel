import { PageHeader } from '@/components/ui/PageHeader';
import { OverviewSkeleton } from '@/components/skeletons/OverviewSkeleton';

export default function Loading() {
  return (
    <>
      <PageHeader title="Overview" description="How the store is doing: sales, orders, customers and stock at a glance." />
      <OverviewSkeleton />
    </>
  );
}
