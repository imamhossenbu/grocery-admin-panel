import { Suspense } from 'react';
import type { Metadata } from 'next';
import { requireAdminPage } from '@/lib/auth';
import { PageHeader } from '@/components/ui/PageHeader';
import { ProfileView } from '@/components/profile/ProfileView';
import { SettingsSkeleton } from '@/components/skeletons/SettingsSkeleton';

export const metadata: Metadata = { title: 'Profile' };

async function ProfileContent() {
  const { email, name, avatarUrl, lastSignInAt, createdAt } = await requireAdminPage();
  return <ProfileView admin={{ email, name, avatarUrl, lastSignInAt, createdAt }} />;
}

export default function ProfilePage() {
  return (
    <>
      <PageHeader title="Profile" description="Your name, sign-in email and password." />
      <Suspense fallback={<SettingsSkeleton />}>
        <ProfileContent />
      </Suspense>
    </>
  );
}
