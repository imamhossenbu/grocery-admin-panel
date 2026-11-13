import type { Category, Product } from '@/types/store';

// ---------------------------------------------------------------------------
// Pure helpers for the category tree (categories.parent_id). Used by the
// admin UI and by the server-side validation, so this file must stay free of
// React, Supabase and Node-only imports.
// ---------------------------------------------------------------------------

/** The database trigger rejects trees deeper than this (root = level 1). */
export const MAX_CATEGORY_DEPTH = 3;

/** Separator used when a category is shown with its ancestors. */
export const CATEGORY_PATH_SEPARATOR = ' › ';

/** The minimum a tree helper needs to know about a category. */
export interface CategoryLink {
  id: string;
  parentId?: string | null;
}

export interface CategoryNode<T extends CategoryLink = Category> {
  category: T;
  /** 1 for a top-level category. */
  depth: number;
  children: CategoryNode<T>[];
}

export interface FlatCategory<T extends CategoryLink = Category> {
  category: T;
  depth: number;
  /** Ancestor ids, root first (excludes the category itself). */
  ancestorIds: string[];
  hasChildren: boolean;
}

function parentOf(c: CategoryLink): string | null {
  return c.parentId ? c.parentId : null;
}

function compareCategories(a: CategoryLink, b: CategoryLink): number {
  const sa = (a as { sortOrder?: number }).sortOrder ?? 0;
  const sb = (b as { sortOrder?: number }).sortOrder ?? 0;
  if (sa !== sb) return sa - sb;
  const na = (a as { name?: string }).name ?? a.id;
  const nb = (b as { name?: string }).name ?? b.id;
  return na.localeCompare(nb) || a.id.localeCompare(b.id);
}

/** Map of id → category. */
export function indexCategories<T extends CategoryLink>(categories: readonly T[]): Map<string, T> {
  return new Map(categories.map((c) => [c.id, c]));
}

/** Map of parent id (null = top level) → children, sorted by sortOrder then name. */
export function childrenByParent<T extends CategoryLink>(
  categories: readonly T[]
): Map<string | null, T[]> {
  const byId = indexCategories(categories);
  const map = new Map<string | null, T[]>();
  for (const c of categories) {
    // A parent that is not in the list (should not happen) makes it a root.
    const parent = parentOf(c);
    const key = parent && byId.has(parent) && parent !== c.id ? parent : null;
    const list = map.get(key);
    if (list) list.push(c);
    else map.set(key, [c]);
  }
  for (const list of map.values()) list.sort(compareCategories);
  return map;
}

/**
 * Builds the nested tree. Categories whose parent is missing are shown at the
 * top level; anything caught in a cycle (impossible with the DB trigger) is
 * skipped rather than looping forever.
 */
export function buildCategoryTree<T extends CategoryLink>(
  categories: readonly T[]
): CategoryNode<T>[] {
  const byParent = childrenByParent(categories);
  const seen = new Set<string>();

  const build = (parent: string | null, depth: number): CategoryNode<T>[] => {
    const nodes: CategoryNode<T>[] = [];
    for (const c of byParent.get(parent) ?? []) {
      if (seen.has(c.id)) continue;
      seen.add(c.id);
      nodes.push({ category: c, depth, children: build(c.id, depth + 1) });
    }
    return nodes;
  };

  return build(null, 1);
}

/** Depth-first list in display order. */
export function flattenTree<T extends CategoryLink>(
  nodes: readonly CategoryNode<T>[],
  isExpanded: (id: string) => boolean = () => true
): FlatCategory<T>[] {
  const out: FlatCategory<T>[] = [];
  const walk = (list: readonly CategoryNode<T>[], ancestors: string[]) => {
    for (const node of list) {
      out.push({
        category: node.category,
        depth: node.depth,
        ancestorIds: ancestors,
        hasChildren: node.children.length > 0,
      });
      if (node.children.length && isExpanded(node.category.id)) {
        walk(node.children, [...ancestors, node.category.id]);
      }
    }
  };
  walk(nodes, []);
  return out;
}

/** Ids of every category below `id` (not including `id`). */
export function getDescendantIds<T extends CategoryLink>(
  categories: readonly T[],
  id: string
): Set<string> {
  const byParent = childrenByParent(categories);
  const out = new Set<string>();
  const stack = [id];
  while (stack.length) {
    const current = stack.pop()!;
    for (const child of byParent.get(current) ?? []) {
      if (child.id === id || out.has(child.id)) continue;
      out.add(child.id);
      stack.push(child.id);
    }
  }
  return out;
}

/** `id` plus all of its descendants. */
export function getSubtreeIds<T extends CategoryLink>(
  categories: readonly T[],
  id: string
): Set<string> {
  const ids = getDescendantIds(categories, id);
  ids.add(id);
  return ids;
}

/** Ancestors of `id`, root first (excluding `id`). Stops on missing parents or cycles. */
export function getAncestors<T extends CategoryLink>(categories: readonly T[], id: string): T[] {
  const byId = indexCategories(categories);
  const out: T[] = [];
  const seen = new Set<string>([id]);
  let cursor = byId.get(id);
  while (cursor) {
    const parent = parentOf(cursor);
    if (!parent || seen.has(parent)) break;
    const next = byId.get(parent);
    if (!next) break;
    seen.add(parent);
    out.unshift(next);
    cursor = next;
  }
  return out;
}

/** Level of a category: 1 for top level, 2 for a child, … */
export function getDepth<T extends CategoryLink>(categories: readonly T[], id: string): number {
  return getAncestors(categories, id).length + 1;
}

/** Number of levels in the subtree rooted at `id` (1 for a leaf). */
export function getSubtreeHeight<T extends CategoryLink>(
  categories: readonly T[],
  id: string
): number {
  const byParent = childrenByParent(categories);
  const seen = new Set<string>();
  const height = (current: string): number => {
    if (seen.has(current)) return 0;
    seen.add(current);
    let max = 0;
    for (const child of byParent.get(current) ?? []) max = Math.max(max, height(child.id));
    return max + 1;
  };
  return height(id);
}

/** The top-level category `id` belongs to (itself when it is top level). */
export function getRootId<T extends CategoryLink>(categories: readonly T[], id: string): string {
  return getAncestors(categories, id)[0]?.id ?? id;
}

/** "Fruits › Local fruits" — falls back to the raw id for unknown categories. */
export function getCategoryPath(
  categories: readonly Category[],
  id: string,
  separator = CATEGORY_PATH_SEPARATOR
): string {
  const self = categories.find((c) => c.id === id);
  if (!self) return id;
  return [...getAncestors(categories, id), self].map((c) => c.name).join(separator);
}

export type ParentCheck =
  | { ok: true }
  | { ok: false; reason: 'NOT_FOUND' | 'SELF' | 'CYCLE' | 'TOO_DEEP' };

/**
 * Can `id` (existing or new) be placed under `parentId`? `null` (top level) is
 * always allowed. Checks the whole subtree that moves along with `id`.
 */
export function checkParent<T extends CategoryLink>(
  categories: readonly T[],
  id: string,
  parentId: string | null
): ParentCheck {
  if (parentId === null) return { ok: true };
  if (parentId === id) return { ok: false, reason: 'SELF' };
  if (!categories.some((c) => c.id === parentId)) return { ok: false, reason: 'NOT_FOUND' };
  if (getDescendantIds(categories, id).has(parentId)) return { ok: false, reason: 'CYCLE' };
  const exists = categories.some((c) => c.id === id);
  const height = exists ? getSubtreeHeight(categories, id) : 1;
  if (getDepth(categories, parentId) + height > MAX_CATEGORY_DEPTH) {
    return { ok: false, reason: 'TOO_DEEP' };
  }
  return { ok: true };
}

export interface CategoryOption {
  id: string;
  name: string;
  depth: number;
  /** "Fruits › Local fruits" */
  path: string;
  /** Name indented with non-breaking spaces, for <option> lists. */
  indentedLabel: string;
  disabled: boolean;
}

/**
 * Categories in tree order for a <select>. `excludeSubtreeOf` drops that
 * category and everything below it (a category cannot be its own parent);
 * `disable` greys out options that are present but not allowed.
 */
export function categoryOptions(
  categories: readonly Category[],
  opts: { excludeSubtreeOf?: string; disable?: (c: Category) => boolean } = {}
): CategoryOption[] {
  const excluded = opts.excludeSubtreeOf
    ? getSubtreeIds(categories, opts.excludeSubtreeOf)
    : new Set<string>();
  const byId = indexCategories(categories);
  return flattenTree(buildCategoryTree(categories))
    .filter((f) => !excluded.has(f.category.id))
    .map((f) => {
      const names = [...f.ancestorIds.map((a) => byId.get(a)?.name ?? a), f.category.name];
      return {
        id: f.category.id,
        name: f.category.name,
        depth: f.depth,
        path: names.join(CATEGORY_PATH_SEPARATOR),
        indentedLabel: `${'    '.repeat(f.depth - 1)}${f.depth > 1 ? '└ ' : ''}${f.category.name}`,
        disabled: opts.disable ? opts.disable(f.category) : false,
      };
    });
}

/** Keeps nodes that match `query` (name, slug or blurb) plus their ancestors. */
export function filterCategoryTree(
  nodes: readonly CategoryNode<Category>[],
  query: string
): CategoryNode<Category>[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...nodes];
  const out: CategoryNode<Category>[] = [];
  for (const node of nodes) {
    const children = filterCategoryTree(node.children, q);
    if (categoryMatches(node.category, q) || children.length) {
      out.push({ ...node, children });
    }
  }
  return out;
}

export function categoryMatches(c: Category, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return false;
  return (
    c.name.toLowerCase().includes(q) ||
    c.id.toLowerCase().includes(q) ||
    (c.blurb ?? '').toLowerCase().includes(q)
  );
}

export interface CategoryCounts {
  /** Products whose category is exactly this one. */
  own: number;
  /** Products in this category or any category below it. */
  total: number;
  /** Direct subcategories. */
  children: number;
}

/** Product and subcategory counts for every category. */
export function countByCategory(
  categories: readonly Category[],
  products: readonly Pick<Product, 'category'>[]
): Map<string, CategoryCounts> {
  const own = new Map<string, number>();
  for (const p of products) own.set(p.category, (own.get(p.category) ?? 0) + 1);

  const byParent = childrenByParent(categories);
  const result = new Map<string, CategoryCounts>();
  const seen = new Set<string>();
  const visit = (c: Category): number => {
    if (seen.has(c.id)) return result.get(c.id)?.total ?? 0;
    seen.add(c.id);
    const kids = byParent.get(c.id) ?? [];
    let total = own.get(c.id) ?? 0;
    for (const k of kids) total += visit(k);
    result.set(c.id, { own: own.get(c.id) ?? 0, total, children: kids.length });
    return total;
  };
  for (const c of categories) visit(c);
  return result;
}

/** Siblings of `id` (including itself) in display order, plus their parent. */
export function getSiblings<T extends CategoryLink>(
  categories: readonly T[],
  id: string
): { parentId: string | null; siblings: T[] } {
  const byParent = childrenByParent(categories);
  for (const [parentId, list] of byParent) {
    if (list.some((c) => c.id === id)) return { parentId, siblings: list };
  }
  return { parentId: null, siblings: [] };
}

/** Sibling ids after moving `id` one place up (-1) or down (+1); null if it cannot move. */
export function moveAmongSiblings<T extends CategoryLink>(
  categories: readonly T[],
  id: string,
  direction: -1 | 1
): { parentId: string | null; ids: string[] } | null {
  const { parentId, siblings } = getSiblings(categories, id);
  const ids = siblings.map((c) => c.id);
  const from = ids.indexOf(id);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= ids.length) return null;
  [ids[from], ids[to]] = [ids[to], ids[from]];
  return { parentId, ids };
}
