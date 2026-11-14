import { Suspense } from 'react';
import type { Metadata } from 'next';
import { requireAdminWith } from '@/lib/auth';
import { getStoreStats } from '@/lib/cached-queries';
import { LOW_STOCK_THRESHOLD, STORE_TIMEZONE } from '@/lib/constants';
import { LoadError } from '@/components/ui/LoadError';
import { safeLoad } from '@/lib/safe-load';
import { GeneralSettings } from '@/components/settings/SettingsView';
import { SettingsSectionSkeleton } from '@/components/skeletons/SettingsSkeleton';

export const metadata: Metadata = { title: 'Settings' };

function host(url: string | undefined): string | null {
  try {
    return url ? new URL(url).host : null;
  } catch {
    return null;
  }
}

async function GeneralContent() {
  const [, r] = await requireAdminWith(() => safeLoad(() => getStoreStats()));
  if (!r.ok) return <LoadError error={r.error} />;
  return (
    <GeneralSettings
      info={{
        storefrontUrl: process.env.STOREFRONT_URL || null,
        supabaseHost: host(process.env.NEXT_PUBLIC_SUPABASE_URL),
        cloudinaryCloud: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || null,
        revalidateConfigured: !!(process.env.STOREFRONT_URL && process.env.REVALIDATE_SECRET),
        lowStock: LOW_STOCK_THRESHOLD,
        timezone: STORE_TIMEZONE,
        stats: r.data,
      }}
    />
  );
}

export default function GeneralSettingsPage() {
  return (
    <Suspense fallback={<SettingsSectionSkeleton cards={2} />}>
      <GeneralContent />
    </Suspense>
  );
}
