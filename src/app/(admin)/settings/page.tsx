import { Suspense } from 'react';
import type { Metadata } from 'next';
import { requireAdminPage } from '@/lib/auth';
import { getStoreStats, listAdmins } from '@/lib/admin-queries';
import { DELIVERY_FEE, FREE_DELIVERY_FROM, LOW_STOCK_THRESHOLD, STORE_TIMEZONE } from '@/lib/constants';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadError } from '@/components/ui/LoadError';
import { safeLoad } from '@/lib/safe-load';
import { SettingsView } from '@/components/settings/SettingsView';
import { SettingsSkeleton } from '@/components/skeletons/SettingsSkeleton';

export const metadata: Metadata = { title: 'Settings' };

function host(url: string | undefined): string | null {
  try {
    return url ? new URL(url).host : null;
  } catch {
    return null;
  }
}

async function SettingsContent() {
  const me = await requireAdminPage();
  const r = await safeLoad(() => Promise.all([listAdmins(), getStoreStats()]));
  if (!r.ok) return <LoadError error={r.error} />;
  const [admins, stats] = r.data;
  {
    return (
      <SettingsView
        currentEmail={me.email}
        admins={admins}
        info={{
          storefrontUrl: process.env.STOREFRONT_URL || null,
          supabaseHost: host(process.env.NEXT_PUBLIC_SUPABASE_URL),
          cloudinaryCloud: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || null,
          revalidateConfigured: !!(process.env.STOREFRONT_URL && process.env.REVALIDATE_SECRET),
          freeDeliveryFrom: FREE_DELIVERY_FROM,
          deliveryFee: DELIVERY_FEE,
          lowStock: LOW_STOCK_THRESHOLD,
          timezone: STORE_TIMEZONE,
          stats,
        }}
      />
    );
  }
}

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" description="Store configuration, storefront cache and administrator accounts." />
      <Suspense fallback={<SettingsSkeleton />}>
        <SettingsContent />
      </Suspense>
    </>
  );
}
