import { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requireAdminWith } from '@/lib/auth';
import { safeLoad } from '@/lib/safe-load';
import { getOrder } from '@/lib/cached-queries';
import { one, type RawSearchParams } from '@/lib/filters';
import { LoadError } from '@/components/ui/LoadError';
import { OrderDetailView } from '@/components/orders/OrderDetailView';
import { OrderDetailSkeleton } from '@/components/skeletons/OrdersSkeleton';

export const metadata: Metadata = { title: 'Order' };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<RawSearchParams> };

async function OrderContent({ params, searchParams }: Props) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const orderId = decodeURIComponent(id).slice(0, 100);
  const [, r] = await requireAdminWith(() => safeLoad(() => getOrder(orderId)));
  if (!r.ok) return <LoadError error={r.error} />;
  const found = r.data;
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
