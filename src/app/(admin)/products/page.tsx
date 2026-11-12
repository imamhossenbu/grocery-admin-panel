import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { requireAdminPage } from '@/lib/auth';
import { listProducts } from '@/lib/admin-queries';
import { parseProductFilters, type RawSearchParams } from '@/lib/filters';
import { PageHeader } from '@/components/ui/PageHeader';
import { buttonClass } from '@/components/ui/Button';
import { LoadError } from '@/components/ui/LoadError';
import { safeLoad } from '@/lib/safe-load';
import { ProductsView } from '@/components/products/ProductsView';
import { ProductsSkeleton } from '@/components/skeletons/ProductsSkeleton';

export const metadata: Metadata = { title: 'Products' };

const productsHeader = (
  <PageHeader
    title="Products"
    description="Prices, stock and visibility for everything in the catalog."
    actions={
      <Link href="/products/new" className={buttonClass('primary', 'md')}>
        <Plus className="h-4 w-4" /> Add product
      </Link>
    }
  />
);

async function ProductsContent({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  await requireAdminPage();
  const filters = parseProductFilters(await searchParams);
  const r = await safeLoad(() => listProducts(filters));
  if (!r.ok) return <LoadError error={r.error} />;
  return <ProductsView data={r.data} filters={filters} />;
}

export default function ProductsPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  return (
    <>
      {productsHeader}
      <Suspense fallback={<ProductsSkeleton />}>
        <ProductsContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}
