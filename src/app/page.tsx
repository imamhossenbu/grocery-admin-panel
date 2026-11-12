import { Suspense } from 'react';
import { AdminDashboard } from '@/components/AdminDashboard';
import { AdminAccount, AdminAccountFallback } from '@/components/AdminAccount';

/**
 * The dashboard itself is a client component that loads its data from
 * /api/store. proxy.ts only lets admins reach this page; the signed-in
 * admin's email (a request-time read) streams into the navbar behind
 * Suspense, as Cache Components requires.
 */
export default function AdminDashboardPage() {
  return (
    <AdminDashboard
      account={
        <Suspense fallback={<AdminAccountFallback />}>
          <AdminAccount />
        </Suspense>
      }
    />
  );
}
