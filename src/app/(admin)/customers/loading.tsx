import { PageHeader } from '@/components/ui/PageHeader';
import { CustomersSkeleton } from '@/components/skeletons/CustomersSkeleton';

export default function Loading() {
  return (
    <>
      <PageHeader title="Customers" description="Registered shoppers with their order history and lifetime spend." />
      <CustomersSkeleton />
    </>
  );
}
