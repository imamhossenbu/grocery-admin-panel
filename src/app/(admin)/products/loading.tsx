import Link from 'next/link';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { buttonClass } from '@/components/ui/Button';
import { ProductsSkeleton } from '@/components/skeletons/ProductsSkeleton';

export default function Loading() {
  return (
    <>
      <PageHeader
        title="Products"
        description="Prices, stock and visibility for everything in the catalog."
        actions={
          <Link href="/products/new" className={buttonClass('primary', 'md')}>
            <Plus className="h-4 w-4" /> Add product
          </Link>
        }
      />
      <ProductsSkeleton />
    </>
  );
}
