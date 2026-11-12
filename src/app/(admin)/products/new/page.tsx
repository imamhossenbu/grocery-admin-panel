import { Suspense } from 'react';
import type { Metadata } from 'next';
import { requireAdminPage } from '@/lib/auth';
import { getCategoriesData } from '@/lib/admin-queries';
import { categoryTotals } from '@/lib/category-totals';
import { LoadError } from '@/components/ui/LoadError';
import { safeLoad } from '@/lib/safe-load';
import { ProductForm } from '@/components/products/ProductForm';
import { ProductFormSkeleton } from '@/components/skeletons/ProductsSkeleton';

export const metadata: Metadata = { title: 'New product' };

async function NewProduct() {
  await requireAdminPage();
  const r = await safeLoad(() => getCategoriesData());
  if (!r.ok) return <LoadError error={r.error} />;
  return <ProductForm product={null} categories={r.data.categories} categoryTotals={categoryTotals(r.data.categories, r.data.products)} />;
}

export default function NewProductPage() {
  return (
    <Suspense fallback={<ProductFormSkeleton />}>
      <NewProduct />
    </Suspense>
  );
}
