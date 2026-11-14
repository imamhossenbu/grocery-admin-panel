import { Suspense } from 'react';
import type { Metadata } from 'next';
import { requireAdminWith } from '@/lib/auth';
import { getDeliverySettings } from '@/lib/cached-queries';
import { LoadError } from '@/components/ui/LoadError';
import { safeLoad } from '@/lib/safe-load';
import { DeliverySettingsCard } from '@/components/settings/DeliverySettingsCard';
import { SettingsSectionSkeleton } from '@/components/skeletons/SettingsSkeleton';

export const metadata: Metadata = { title: 'Delivery settings' };

async function DeliveryContent() {
  const [, r] = await requireAdminWith(() => safeLoad(() => getDeliverySettings()));
  if (!r.ok) return <LoadError error={r.error} />;
  return <DeliverySettingsCard state={r.data} />;
}

export default function DeliverySettingsPage() {
  return (
    <Suspense fallback={<SettingsSectionSkeleton cards={1} />}>
      <DeliveryContent />
    </Suspense>
  );
}
