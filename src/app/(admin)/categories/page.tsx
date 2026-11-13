import { Suspense } from 'react';
import type { Metadata } from 'next';
import { requireAdminPage } from '@/lib/auth';
import { getCategoriesData } from '@/lib/admin-queries';
import { one, type RawSearchParams } from '@/lib/filters';
import { LoadError } from '@/components/ui/LoadError';
import { safeLoad } from '@/lib/safe-load';
import { CategoriesView } from '@/components/categories/CategoriesView';
import { CategoriesSkeleton } from '@/components/skeletons/CategoriesSkeleton';

export const metadata: Metadata = { title: 'Categories' };

async function CategoriesContent({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  await requireAdminPage();
  const sp = await searchParams;
  const add = 'add' in sp ? one(sp, 'add') : null;
  const r = await safeLoad(() => getCategoriesData());
  if (!r.ok) return <LoadError error={r.error} />;
  return <CategoriesView categories={r.data.categories} products={r.data.products} addUnder={add} />;
}

export default function CategoriesPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  return (
    <Suspense fallback={<CategoriesSkeleton />}>
      <CategoriesContent searchParams={searchParams} />
    </Suspense>
  );
}
