import Link from 'next/link';
import { SearchX } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { buttonClass } from '@/components/ui/Button';

export default function ProductNotFound() {
  return (
    <EmptyState
      icon={<SearchX className="h-6 w-6" />}
      title="Product not found"
      description="It may have been deleted, or the link is mistyped."
      action={
        <Link href="/products" className={buttonClass('primary', 'sm', 'mt-5')}>
          Back to products
        </Link>
      }
    />
  );
}
