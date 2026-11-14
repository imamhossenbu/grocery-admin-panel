import { Suspense } from 'react';
import type { Metadata } from 'next';
import { requireAdminWith } from '@/lib/auth';
import { listCustomers } from '@/lib/cached-queries';
import { parseCustomerFilters, type RawSearchParams } from '@/lib/filters';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadError } from '@/components/ui/LoadError';
import { safeLoad } from '@/lib/safe-load';
import { CustomersView } from '@/components/customers/CustomersView';
import { CustomersSkeleton } from '@/components/skeletons/CustomersSkeleton';

export const metadata: Metadata = { title: 'Customers' };

async function CustomersContent({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const filters = parseCustomerFilters(await searchParams);
  const [, r] = await requireAdminWith(() => safeLoad(() => listCustomers(filters)));
  if (!r.ok) return <LoadError error={r.error} />;
  return <CustomersView data={r.data} filters={filters} />;
}

export default function CustomersPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  return (
    <>
      <PageHeader title="Customers" description="Registered shoppers with their order history and lifetime spend." />
      <Suspense fallback={<CustomersSkeleton />}>
        <CustomersContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}
