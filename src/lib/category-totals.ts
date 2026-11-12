import type { Category, Product } from '@/types/store';
import { countByCategory } from './category-tree';

/** Products per category including subcategories, as a plain object (serializable). */
export function categoryTotals(categories: Category[], products: Pick<Product, 'category'>[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [id, c] of countByCategory(categories, products)) out[id] = c.total;
  return out;
}
