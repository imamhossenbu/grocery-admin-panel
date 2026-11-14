'use client';

import React, { useId, useMemo, useRef, useState } from 'react';
import * as RP from '@radix-ui/react-popover';
import { motion } from 'motion/react';
import { Popover, PopoverContent } from './Popover';
import { Check, ChevronDown, FolderPlus, Layers, Search, X } from 'lucide-react';
import type { Category, Product } from '@/types/store';
import {
  CATEGORY_PATH_SEPARATOR,
  MAX_CATEGORY_DEPTH,
  buildCategoryTree,
  countByCategory,
  filterCategoryTree,
  flattenTree,
  getAncestors,
  getSubtreeIds,
  type CategoryNode,
} from '@/lib/category-tree';
import { cn } from '@/lib/cn';
import { triggerBase } from './Select';
import { CategoryThumb, Highlight, TreeChevron, TreeCollapse, treeIndent } from './CategoryTree';

export interface CategoryTreeSelectProps {
  categories: Category[];
  /** Selected category id; '' / null = nothing (or "top level" when `noneLabel` is set). */
  value: string | null;
  onChange: (id: string | null) => void;
  /** Products (only `category` is read) for the count pill. */
  products?: Pick<Product, 'category'>[];
  /** Precomputed totals per category (overrides `products`). */
  counts?: Map<string, number>;
  /** Offer a "none" row (e.g. "Top level", "All categories"). */
  noneLabel?: string;
  /** Hide this category and everything below it (a category can't be its own parent). */
  excludeSubtreeOf?: string;
  /** Return a reason string to disable a row (shown under its name). */
  disabledReason?: (c: Category) => string | null;
  /** Shows "Create subcategory here" for the highlighted row. */
  onCreateSubcategory?: (parentId: string) => void;
  placeholder?: string;
  name?: string;
  id?: string;
  size?: 'sm' | 'md';
  className?: string;
  disabled?: boolean;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
}

const NONE = '\u0000none';

/**
 * Category picker that looks and behaves like the category tree:
 * arrows expand/collapse branches (animated), clicking a name selects it
 * (any level), search keeps ancestors of matches and opens them, and the
 * selected branch is pre-expanded on open.
 *
 * Keyboard: ↑/↓ move · → expand / go to first child · ← collapse / go to
 * parent · Enter select · Esc close. Type in the search box at any time.
 */
export function CategoryTreeSelect({
  categories,
  value,
  onChange,
  products,
  counts: countsProp,
  noneLabel,
  excludeSubtreeOf,
  disabledReason,
  onCreateSubcategory,
  placeholder = 'Choose a category',
  name,
  id,
  size = 'md',
  className = '',
  disabled,
  ...aria
}: CategoryTreeSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [active, setActive] = useState<string | null>(null);
  const baseId = useId();
  const treeId = `${baseId}-tree`;
  const searchRef = useRef<HTMLInputElement>(null);

  const pool = useMemo(() => {
    if (!excludeSubtreeOf) return categories;
    const out = getSubtreeIds(categories, excludeSubtreeOf);
    return categories.filter((c) => !out.has(c.id));
  }, [categories, excludeSubtreeOf]);

  const tree = useMemo(() => buildCategoryTree(pool), [pool]);
  const totals = useMemo(() => {
    if (countsProp) return countsProp;
    if (!products) return null;
    const m = new Map<string, number>();
    for (const [k, v] of countByCategory(categories, products)) m.set(k, v.total);
    return m;
  }, [countsProp, products, categories]);

  const searching = query.trim().length > 0;
  const visibleTree = useMemo(() => (searching ? filterCategoryTree(tree, query) : tree), [tree, query, searching]);
  const isOpenNode = (cid: string) => searching || expanded.has(cid);
  const flat = flattenTree(visibleTree, isOpenNode);
  const rowIds = [...(noneLabel && !searching ? [NONE] : []), ...flat.map((f) => f.category.id)];
  const flatById = new Map(flat.map((f) => [f.category.id, f]));

  const selected = value ? categories.find((c) => c.id === value) : undefined;
  const selectedPath = selected
    ? [...getAncestors(categories, selected.id), selected].map((c) => c.name).join(CATEGORY_PATH_SEPARATOR)
    : '';

  const optionDomId = (cid: string) => `${baseId}-n-${cid === NONE ? 'none' : cid.replace(/[^a-zA-Z0-9_-]/g, '_')}`;

  const scrollTo = (cid: string) =>
    requestAnimationFrame(() => document.getElementById(optionDomId(cid))?.scrollIntoView({ block: 'nearest' }));

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) return;
    setQuery('');
    // Pre-expand the selected branch.
    const branch = selected ? getAncestors(categories, selected.id).map((c) => c.id) : [];
    setExpanded(new Set(branch));
    const start = selected?.id ?? (noneLabel ? NONE : tree[0]?.category.id ?? null);
    setActive(start);
    if (start) scrollTo(start);
  };

  const toggle = (cid: string) =>
    setExpanded((prev) => {
      const n = new Set(prev);
      if (n.has(cid)) n.delete(cid);
      else n.add(cid);
      return n;
    });

  const reasonFor = (c: Category) => (disabledReason ? disabledReason(c) : null);

  const choose = (cid: string) => {
    if (cid === NONE) {
      onChange(null);
      setOpen(false);
      return;
    }
    const c = flatById.get(cid)?.category;
    if (!c || reasonFor(c)) return;
    onChange(c.id);
    setOpen(false);
  };

  const move = (cid: string | undefined) => {
    if (!cid) return;
    setActive(cid);
    scrollTo(cid);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const at = active ? rowIds.indexOf(active) : -1;
    const item = active ? flatById.get(active) : undefined;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        move(rowIds[Math.min(at + 1, rowIds.length - 1)] ?? rowIds[0]);
        break;
      case 'ArrowUp':
        e.preventDefault();
        move(rowIds[Math.max(at - 1, 0)]);
        break;
      case 'ArrowRight':
        if (!item?.hasChildren) return;
        e.preventDefault();
        if (!isOpenNode(item.category.id)) toggle(item.category.id);
        else move(rowIds[at + 1]);
        break;
      case 'ArrowLeft':
        if (!item) return;
        // Let the caret move inside the search text when there is some.
        if (searching && (e.target as HTMLElement).tagName === 'INPUT') return;
        e.preventDefault();
        if (item.hasChildren && isOpenNode(item.category.id) && !searching) toggle(item.category.id);
        else move(item.ancestorIds[item.ancestorIds.length - 1]);
        break;
      case 'Enter':
        e.preventDefault();
        if (active) choose(active);
        break;
      case 'Tab':
        setOpen(false);
        break;
    }
  };

  const activeItem = active ? flatById.get(active) : undefined;
  const canCreateHere = !!onCreateSubcategory && !!activeItem && activeItem.depth < MAX_CATEGORY_DEPTH;

  const renderNodes = (nodes: CategoryNode<Category>[], depth: number): React.ReactNode =>
    nodes.map((node, i) => {
      const c = node.category;
      const hasChildren = node.children.length > 0;
      const isExp = hasChildren && isOpenNode(c.id);
      const isSel = c.id === value;
      const isAct = c.id === active;
      const reason = reasonFor(c);
      const total = totals?.get(c.id);
      return (
        <li
          key={c.id}
          role="treeitem"
          id={optionDomId(c.id)}
          aria-level={depth}
          aria-setsize={nodes.length}
          aria-posinset={i + 1}
          aria-selected={isSel}
          aria-expanded={hasChildren ? isExp : undefined}
          aria-disabled={reason ? true : undefined}
        >
          <div
            onPointerMove={() => active !== c.id && setActive(c.id)}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => choose(c.id)}
            style={{ paddingLeft: treeIndent(depth, 6) }}
            className={cn(
              'flex min-h-11 cursor-pointer items-center gap-2 rounded-lg pr-2.5 transition-colors duration-100',
              isSel ? 'bg-mint' : isAct ? 'bg-mint-50' : '',
              isAct && 'ring-1 ring-inset ring-primary/30',
              reason && 'cursor-not-allowed'
            )}
          >
            <TreeChevron
              expanded={isExp}
              hasChildren={hasChildren}
              onToggle={() => toggle(c.id)}
              disabled={searching}
              label={isExp ? `Collapse ${c.name}` : `Expand ${c.name}`}
            />
            <span className={cn('flex min-w-0 flex-1 items-center gap-2.5', reason && 'opacity-50')}>
              <CategoryThumb src={c.image} isParent={hasChildren || depth === 1} size={depth === 1 ? 'md' : 'sm'} />
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    'block truncate text-sm',
                    hasChildren || depth === 1 ? 'font-semibold text-ink' : 'font-normal text-ink-2',
                    isSel && 'text-primary-600'
                  )}
                >
                  <Highlight text={c.name} query={query} />
                </span>
                {reason && <span className="block truncate text-[13px] text-muted">{reason}</span>}
              </span>
            </span>
            {total !== undefined && (
              <span className="tabular shrink-0 rounded-full bg-[#eef3f0] px-2 py-0.5 text-xs font-medium text-muted">
                {total}
              </span>
            )}
            <span className="grid w-5 shrink-0 place-items-center">
              {isSel && <Check className="h-4 w-4 text-primary" strokeWidth={2.75} />}
            </span>
          </div>
          {hasChildren && <TreeCollapse open={isExp}>{renderNodes(node.children, depth + 1)}</TreeCollapse>}
        </li>
      );
    });

  const h = size === 'sm' ? 'h-9 px-2.5 text-[13px]' : 'h-10 px-3 text-sm';

  return (
      <Popover open={open} onOpenChange={onOpenChange}>
        {name && <input type="hidden" name={name} value={value ?? ''} />}
        <RP.Trigger
          id={id}
          disabled={disabled}
          role="combobox"
          aria-haspopup="tree"
          aria-expanded={open}
          aria-controls={open ? treeId : undefined}
          aria-label={aria['aria-label']}
          aria-labelledby={aria['aria-labelledby']}
          aria-describedby={aria['aria-describedby']}
          aria-invalid={aria['aria-invalid'] || undefined}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
              e.preventDefault();
              onOpenChange(true);
            }
          }}
          className={cn(triggerBase, h, className)}
        >
          {selected ? (
            <CategoryThumb src={selected.image} isParent={!selected.parentId} size="sm" />
          ) : (
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-[#f1f5f2] text-muted">
              <Layers className="h-3.5 w-3.5" />
            </span>
          )}
          <span className={cn('min-w-0 flex-1 truncate', !selected && (noneLabel ? 'text-ink' : 'text-[#7e9688]'))}>
            {selected ? selectedPath : noneLabel ?? placeholder}
          </span>
          <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }} className="shrink-0">
            <ChevronDown className="h-4 w-4 text-muted" />
          </motion.span>
        </RP.Trigger>
          <PopoverContent
            unstyled
            align="start"
            sideOffset={6}
            onOpenAutoFocus={(e) => {
              e.preventDefault();
              searchRef.current?.focus();
            }}
            onKeyDown={onKeyDown}
            className={cn(
              'flex max-h-[min(460px,var(--radix-popover-content-available-height))] w-[max(var(--radix-popover-trigger-width),340px)] max-w-[calc(100vw-24px)] flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-pop'
            )}
          >
            <div className="border-b border-line p-2.5">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    const q = e.target.value.trim();
                    if (q) {
                      const firstMatch = flattenTree(filterCategoryTree(tree, q)).find((f) =>
                        f.category.name.toLowerCase().includes(q.toLowerCase())
                      );
                      setActive(firstMatch?.category.id ?? null);
                    }
                  }}
                  placeholder="Search categories…"
                  role="combobox"
                  aria-expanded
                  aria-controls={treeId}
                  aria-activedescendant={active ? optionDomId(active) : undefined}
                  aria-autocomplete="list"
                  aria-label="Search categories"
                  className="h-10 w-full rounded-xl bg-mint-25 pl-9 pr-9 text-sm text-ink outline-none ring-1 ring-line placeholder:text-[#7e9688] focus:ring-2 focus:ring-primary/40"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery('');
                      searchRef.current?.focus();
                    }}
                    aria-label="Clear search"
                    className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 cursor-pointer place-items-center rounded-full text-muted hover:bg-mint"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            <ul id={treeId} role="tree" aria-label={aria['aria-label'] ?? 'Categories'} className="flex-1 overflow-y-auto p-1.5">
              {noneLabel && !searching && (
                <li role="treeitem" id={optionDomId(NONE)} aria-selected={!value} aria-level={1}>
                  <div
                    onPointerMove={() => active !== NONE && setActive(NONE)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => choose(NONE)}
                    className={cn(
                      'flex min-h-11 cursor-pointer items-center gap-2 rounded-lg pl-1.5 pr-2.5 transition-colors',
                      !value ? 'bg-mint' : active === NONE ? 'bg-mint-50' : '',
                      active === NONE && 'ring-1 ring-inset ring-primary/30'
                    )}
                  >
                    <span aria-hidden className="h-7 w-7 shrink-0" />
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#f1f5f2] text-muted">
                      <Layers className="h-4 w-4" />
                    </span>
                    <span className="flex-1 text-sm font-semibold text-ink">{noneLabel}</span>
                    <span className="grid w-5 place-items-center">{!value && <Check className="h-4 w-4 text-primary" strokeWidth={2.75} />}</span>
                  </div>
                </li>
              )}
              {visibleTree.length === 0 ? (
                <li role="presentation" className="px-4 py-8 text-center text-sm text-muted">
                  No category matches “{query.trim()}”.
                </li>
              ) : (
                renderNodes(visibleTree, 1)
              )}
            </ul>

            <div className="flex items-center justify-between gap-2 border-t border-line bg-mint-25 px-3 py-2 text-xs text-muted">
              <span className="hidden sm:inline">↑↓ move · →← open/close · Enter select</span>
              {canCreateHere ? (
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    const pid = activeItem!.category.id;
                    setOpen(false);
                    onCreateSubcategory!(pid);
                  }}
                  className="ml-auto inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1 text-[13px] font-semibold text-primary-600 transition hover:bg-mint"
                >
                  <FolderPlus className="h-4 w-4" />
                  <span className="max-w-48 truncate">New subcategory in {activeItem!.category.name}</span>
                </button>
              ) : (
                <span className="ml-auto">{pool.length} categories</span>
              )}
            </div>
          </PopoverContent>
      </Popover>
  );
}
