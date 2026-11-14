import { Suspense } from 'react';
import type { Metadata } from 'next';
import { requireAdminWith } from '@/lib/auth';
import { listAdmins } from '@/lib/cached-queries';
import { LoadError } from '@/components/ui/LoadError';
import { safeLoad } from '@/lib/safe-load';
import { TeamCard } from '@/components/settings/TeamCard';
import { SettingsSectionSkeleton } from '@/components/skeletons/SettingsSkeleton';

export const metadata: Metadata = { title: 'Team' };

async function TeamContent() {
  const [me, r] = await requireAdminWith(() => safeLoad(() => listAdmins()));
  if (!r.ok) return <LoadError error={r.error} />;
  return <TeamCard admins={r.data} currentId={me.id} />;
}

export default function TeamSettingsPage() {
  return (
    <Suspense fallback={<SettingsSectionSkeleton cards={1} />}>
      <TeamContent />
    </Suspense>
  );
}
