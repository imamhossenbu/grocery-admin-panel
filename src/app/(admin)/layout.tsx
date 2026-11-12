import { Suspense } from 'react';
import { AppShell } from '@/components/shell/AppShell';
import { AccountMenu } from '@/components/shell/AccountMenu';
import { ProfileMenuSkeleton } from '@/components/shell/ProfileMenu';

/**
 * Admin chrome. The shell itself is static (prerendered, instant); the
 * signed-in admin's menu reads cookies and streams in behind Suspense.
 * proxy.ts keeps non-admins out; every page's data section also calls
 * requireAdminPage().
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const storefrontUrl = process.env.STOREFRONT_URL || undefined;
  return (
    <AppShell
      storefrontUrl={storefrontUrl}
      account={
        <Suspense fallback={<ProfileMenuSkeleton />}>
          <AccountMenu storefrontUrl={storefrontUrl} />
        </Suspense>
      }
    >
      {children}
    </AppShell>
  );
}
