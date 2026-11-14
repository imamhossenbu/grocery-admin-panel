import { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requireAdminWith } from '@/lib/auth';
import { safeLoad } from '@/lib/safe-load';
import { getCustomer } from '@/lib/cached-queries';
import { LoadError } from '@/components/ui/LoadError';
import { CustomerDetailView } from '@/components/customers/CustomerDetailView';
import { CustomerDetailSkeleton } from '@/components/skeletons/CustomersSkeleton';

export const metadata: Metadata = { title: 'Customer' };

async function CustomerContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [, r] = await requireAdminWith(() => safeLoad(() => getCustomer(id)));
  if (!r.ok) return <LoadError error={r.error} />;
  const data = r.data;
  if (!data) notFound();
  return <CustomerDetailView data={data} />;
}

export default function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<CustomerDetailSkeleton />}>
      <CustomerContent params={params} />
    </Suspense>
  );
}
