import Link from 'next/link';
import { SearchX } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { buttonClass } from '@/components/ui/Button';

export default function OrderNotFound() {
  return (
    <EmptyState
      icon={<SearchX className="h-6 w-6" />}
      title="Order not found"
      description="It may have been deleted, or the link is mistyped."
      action={
        <Link href="/orders" className={buttonClass('primary', 'sm', 'mt-5')}>
          Back to orders
        </Link>
      }
    />
  );
}
