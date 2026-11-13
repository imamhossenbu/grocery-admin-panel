import { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requireAdminPage } from '@/lib/auth';
import { getCategoriesData, getProduct } from '@/lib/admin-queries';
import { categoryTotals } from '@/lib/category-totals';
import { LoadError } from '@/components/ui/LoadError';
import { ProductForm } from '@/components/products/ProductForm';
import { ProductFormSkeleton } from '@/components/skeletons/ProductsSkeleton';

export const metadata: Metadata = { title: 'Edit product' };

async function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const { id } = await params;
  let data;
  try {
    const [product, cats] = await Promise.all([getProduct(decodeURIComponent(id).slice(0, 200)), getCategoriesData()]);
    data = { product, ...cats };
  } catch (err) {
    return <LoadError error={err} />;
  }
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
