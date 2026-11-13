import { PageHeader } from '@/components/ui/PageHeader';
import { MessagesSkeleton } from '@/components/skeletons/MessagesSkeleton';

export default function Loading() {
  return (
    <>
      <PageHeader title="Messages" description="Questions and feedback sent through the storefront contact form." />
      <MessagesSkeleton />
    </>
  );
}
