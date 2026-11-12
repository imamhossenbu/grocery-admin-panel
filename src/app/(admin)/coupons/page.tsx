import { Suspense } from 'react';
import type { Metadata } from 'next';
import { requireAdminPage } from '@/lib/auth';
import { listCoupons } from '@/lib/admin-queries';
import { one, type RawSearchParams } from '@/lib/filters';
import { LoadError } from '@/components/ui/LoadError';
import { safeLoad } from '@/lib/safe-load';
import { CouponsView } from '@/components/coupons/CouponsView';
import { SimpleListSkeleton } from '@/components/skeletons/SimpleListSkeleton';

export const metadata: Metadata = { title: 'Coupons' };


async function CouponsContent({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  await requireAdminPage();
  const sp = await searchParams;
  const r = await safeLoad(() => listCoupons());
  if (!r.ok) return <LoadError error={r.error} />;
  return <CouponsView coupons={r.data} openNew={one(sp, 'new') === '1'} />;
}

export default function CouponsPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  return (
    <Suspense fallback={<SimpleListSkeleton label="Loading coupons" cols={['w-32', 'w-28', 'w-36', 'w-32', 'w-20', 'w-11']} />}>
      <CouponsContent searchParams={searchParams} />
    </Suspense>
  );
}
