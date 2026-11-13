import { PageHeader } from '@/components/ui/PageHeader';
import { SettingsSkeleton } from '@/components/skeletons/SettingsSkeleton';

export default function Loading() {
  return (
    <>
      <PageHeader title="Settings" description="Store configuration, storefront cache and administrator accounts." />
      <SettingsSkeleton />
    </>
  );
}
