import { PageHeader } from '@/components/ui/PageHeader';
import { OrdersSkeleton } from '@/components/skeletons/OrdersSkeleton';

export default function Loading() {
  return (
    <>
      <PageHeader title="Orders" description="Confirm, pack and deliver orders. Cash on delivery and online payments in one pipeline." />
      <OrdersSkeleton />
    </>
  );
}
