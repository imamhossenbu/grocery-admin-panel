import { Suspense } from 'react';
import type { Metadata } from 'next';
import { requireAdminPage } from '@/lib/auth';
import { listOrders } from '@/lib/admin-queries';
import { parseOrderFilters, type RawSearchParams } from '@/lib/filters';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadError } from '@/components/ui/LoadError';
import { safeLoad } from '@/lib/safe-load';
import { OrdersView } from '@/components/orders/OrdersView';
import { OrdersSkeleton } from '@/components/skeletons/OrdersSkeleton';

export const metadata: Metadata = { title: 'Orders' };

const HEADER = {
  title: 'Orders',
  description: 'Confirm, pack and deliver orders. Cash on delivery and online payments in one pipeline.',
};

async function OrdersContent({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  await requireAdminPage();
  const filters = parseOrderFilters(await searchParams);
  const r = await safeLoad(() => listOrders(filters));
  if (!r.ok) return <LoadError error={r.error} />;
  return <OrdersView data={r.data} filters={filters} />;
}

export default function OrdersPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  return (
    <>
      <PageHeader {...HEADER} />
      <Suspense fallback={<OrdersSkeleton />}>
        <OrdersContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}
