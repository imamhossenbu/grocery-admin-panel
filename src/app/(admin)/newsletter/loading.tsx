import { PageHeader } from '@/components/ui/PageHeader';
import { NewsletterSkeleton } from '@/components/skeletons/SettingsSkeleton';

export default function Loading() {
  return (
    <>
      <PageHeader title="Newsletter" description="Email addresses collected by the storefront sign-up form." />
      <NewsletterSkeleton />
    </>
  );
}
