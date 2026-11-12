import { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requireAdminPage } from '@/lib/auth';
import { getCustomer } from '@/lib/admin-queries';
import { LoadError } from '@/components/ui/LoadError';
import { CustomerDetailView } from '@/components/customers/CustomerDetailView';
import { CustomerDetailSkeleton } from '@/components/skeletons/CustomersSkeleton';

export const metadata: Metadata = { title: 'Customer' };

async function CustomerContent({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const { id } = await params;
  let data;
  try {
    data = await getCustomer(id);
  } catch (err) {
    return <LoadError error={err} />;
  }
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
