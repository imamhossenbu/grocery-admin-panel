import { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requireAdminPage } from '@/lib/auth';
import { getOrder } from '@/lib/admin-queries';
import { one, type RawSearchParams } from '@/lib/filters';
import { LoadError } from '@/components/ui/LoadError';
import { OrderDetailView } from '@/components/orders/OrderDetailView';
import { OrderDetailSkeleton } from '@/components/skeletons/OrdersSkeleton';

export const metadata: Metadata = { title: 'Order' };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<RawSearchParams> };

async function OrderContent({ params, searchParams }: Props) {
  await requireAdminPage();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const orderId = decodeURIComponent(id).slice(0, 100);
  let found;
  try {
    found = await getOrder(orderId);
  } catch (err) {
    return <LoadError error={err} />;
  }
  if (!found) notFound();
  return <OrderDetailView {...found} autoPrint={one(sp, 'print') === '1'} />;
}

export default function OrderPage(props: Props) {
  return (
    <Suspense fallback={<OrderDetailSkeleton />}>
      <OrderContent {...props} />
    </Suspense>
  );
}
