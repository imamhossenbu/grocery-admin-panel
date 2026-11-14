import { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requireAdminWith } from '@/lib/auth';
import { safeLoad } from '@/lib/safe-load';
import { getCategoriesData, getProduct } from '@/lib/cached-queries';
import { categoryTotals } from '@/lib/category-totals';
import { LoadError } from '@/components/ui/LoadError';
import { ProductForm } from '@/components/products/ProductForm';
import { ProductFormSkeleton } from '@/components/skeletons/ProductsSkeleton';

export const metadata: Metadata = { title: 'Edit product' };

async function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [, r] = await requireAdminWith(() =>
    safeLoad(() => Promise.all([getProduct(decodeURIComponent(id).slice(0, 200)), getCategoriesData()]))
  );
  if (!r.ok) return <LoadError error={r.error} />;
  const data = { product: r.data[0], ...r.data[1] };
  if (!data.product) notFound();
  return (
    <ProductForm
      product={data.product}
      categories={data.categories}
      categoryTotals={categoryTotals(data.categories, data.products)}
      storefrontUrl={process.env.STOREFRONT_URL || undefined}
    />
  );
}

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<ProductFormSkeleton />}>
      <EditProduct params={params} />
    </Suspense>
  );
}
