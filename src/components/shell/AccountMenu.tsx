import 'server-only';
import { requireAdminPage } from '@/lib/auth';
import { ProfileMenu } from './ProfileMenu';

/** Signed-in admin's menu. Reads cookies: render inside <Suspense>. */
export async function AccountMenu({ storefrontUrl }: { storefrontUrl?: string }) {
  const admin = await requireAdminPage();
  return <ProfileMenu email={admin.email} name={admin.name} avatarUrl={admin.avatarUrl} storefrontUrl={storefrontUrl} />;
}
