import { SimpleListSkeleton } from '@/components/skeletons/SimpleListSkeleton';

export default function Loading() {
  return <SimpleListSkeleton label="Loading coupons" cols={['w-32', 'w-28', 'w-36', 'w-32', 'w-20', 'w-11']} />;
}
