'use client';

import React, { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  Edit,
  FolderInput,
  FolderPlus,
  Image as ImageIcon,
  Layers,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { Category, Product } from '@/types/store';
import { slugify } from '@/lib/slug';
import {
  MAX_CATEGORY_DEPTH,
  buildCategoryTree,
  categoryMatches,
  categoryOptions,
  checkParent,
  countByCategory,
  filterCategoryTree,
  flattenTree,
  getCategoryPath,
  getDepth,
  getSiblings,
  moveAmongSiblings,
  type CategoryNode,
  type CategoryOption,
} from '@/lib/category-tree';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { EmptyState } from './ui/EmptyState';
import { ImageUploadField } from './ui/ImageUploadField';

interface CategoriesManagerProps {
  categories: Category[];
  products: Product[];
  /** Each callback resolves true when the server accepted the change. */
  onSaveCategory: (category: Category, isNew: boolean) => Promise<boolean>;
  onMoveCategory: (category: Category, parentId: string | null) => Promise<boolean>;
  onReorderCategories: (parentId: string | null, ids: string[]) => Promise<boolean>;
  onDeleteCategory: (id: string) => Promise<boolean>;
}

const DEFAULT_IMAGE =
  'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80';
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
/** Placeholder id used to check "where may a not-yet-created category go". */
const NEW_ID = '\u0000new';

const inputClass =
  'w-full rounded-xl border border-[#cfe3d6] bg-white px-3.5 py-2 text-xs focus:border-[#1a663b] focus:outline-none';
const iconButtonClass =
  'rounded-lg p-1.5 text-[#5a7165] hover:bg-[#e8f5ee] hover:text-[#1a663b] transition cursor-pointer disabled:opacity-30 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-[#1a663b]';

interface FormState {
  id: string;
  name: string;
  blurb: string;
  description: string;
  image: string;
  parentId: string;
}

const EMPTY_FORM: FormState = {
  id: '',
  name: '',
  blurb: '',
  description: '',
  image: '',
  parentId: '',
};

function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim().toLowerCase();
  const at = q ? text.toLowerCase().indexOf(q) : -1;
  if (at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <mark className="rounded bg-[#fef3c7] px-0.5 text-inherit">{text.slice(at, at + q.length)}</mark>
      {text.slice(at + q.length)}
    </>
  );
}

function ParentSelect({
  id,
  value,
  onChange,
  options,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: CategoryOption[];
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`${inputClass} cursor-pointer`}
    >
      <option value="">— None (top-level category) —</option>
      {options.map((o) => (
        <option key={o.id} value={o.id} disabled={o.disabled}>
          {o.indentedLabel}
          {o.disabled ? ' (too deep)' : ''}
        </option>
      ))}
    </select>
  );
}

export function CategoriesManager({
  categories,
  products,
  onSaveCategory,
  onMoveCategory,
  onReorderCategories,
  onDeleteCategory,
}: CategoriesManagerProps) {
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Add / edit form
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [slugTouched, setSlugTouched] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Move / delete dialogs
  const [moveTarget, setMoveTarget] = useState<Category | null>(null);
  const [moveParent, setMoveParent] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  const itemRefs = useRef(new Map<string, HTMLLIElement>());

  // ---- Derived tree data -------------------------------------------------
  const tree = useMemo(() => buildCategoryTree(categories), [categories]);
  const counts = useMemo(() => countByCategory(categories, products), [categories, products]);
  const searching = query.trim().length > 0;
  const visibleTree = useMemo(
    () => (searching ? filterCategoryTree(tree, query) : tree),
    [tree, query, searching]
  );
  const isExpanded = (id: string) => searching || !collapsed.has(id);
  const visible = flattenTree(visibleTree, isExpanded);
  const parentIds = useMemo(
    () => new Set(categories.map((c) => c.parentId).filter((p): p is string => !!p)),
    [categories]
  );
  const siblingInfo = useMemo(() => {
    const info = new Map<string, { index: number; count: number }>();
    for (const c of categories) {
      if (info.has(c.id)) continue;
      const { siblings } = getSiblings(categories, c.id);
      siblings.forEach((s, index) => info.set(s.id, { index, count: siblings.length }));
    }
    return info;
  }, [categories]);
  const depthById = useMemo(
    () => new Map(categories.map((c) => [c.id, getDepth(categories, c.id)])),
    [categories]
  );

  const topLevelCount = tree.length;
  const subCount = categories.length - topLevelCount;
  const matchCount = searching
    ? categories.filter((c) => categoryMatches(c, query)).length
    : 0;
  const activeId =
    focusedId && visible.some((v) => v.category.id === focusedId)
      ? focusedId
      : visible[0]?.category.id ?? null;

  /** Options for a parent <select>: excludes `selfId`'s subtree, disables too-deep spots. */
  const parentOptions = (selfId: string | null) =>
    categoryOptions(categories, {
      excludeSubtreeOf: selfId ?? undefined,
      disable: (c) => !checkParent(categories, selfId ?? NEW_ID, c.id).ok,
    });

  // ---- Expand / collapse -------------------------------------------------
  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const expand = (id: string) =>
    setCollapsed((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  const expandAll = () => setCollapsed(new Set());
  const collapseAll = () => setCollapsed(new Set(parentIds));

  const focusItem = (id: string | undefined) => {
    if (!id) return;
    setFocusedId(id);
    itemRefs.current.get(id)?.focus();
  };

  // ---- Keyboard navigation (WAI-ARIA tree pattern) -----------------------
  const handleTreeKeyDown = (e: React.KeyboardEvent<HTMLUListElement>) => {
    const target = e.target as HTMLElement;
    if (target.getAttribute('role') !== 'treeitem') return; // let buttons work normally
    const id = target.dataset.id;
    const index = visible.findIndex((v) => v.category.id === id);
    if (!id || index < 0) return;
    const item = visible[index];

    switch (e.key) {
      case 'ArrowDown':
        focusItem(visible[index + 1]?.category.id);
        break;
      case 'ArrowUp':
        focusItem(visible[index - 1]?.category.id);
        break;
      case 'Home':
        focusItem(visible[0]?.category.id);
        break;
      case 'End':
        focusItem(visible[visible.length - 1]?.category.id);
        break;
      case 'ArrowRight':
        if (!item.hasChildren) break;
        if (!isExpanded(id)) expand(id);
        else focusItem(visible[index + 1]?.category.id);
        break;
      case 'ArrowLeft':
        if (item.hasChildren && isExpanded(id) && !searching) toggle(id);
        else focusItem(item.ancestorIds[item.ancestorIds.length - 1]);
        break;
      case 'Enter':
        openEdit(item.category);
        break;
      default:
        return;
    }
    e.preventDefault();
  };

  // ---- Form --------------------------------------------------------------
  const openAdd = (parentId: string | null = null) => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, image: DEFAULT_IMAGE, parentId: parentId ?? '' });
    setSlugTouched(false);
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (c: Category) => {
    setEditing(c);
    setForm({
      id: c.id,
      name: c.name,
      blurb: c.blurb ?? '',
      description: c.description ?? '',
      image: c.image ?? '',
      parentId: c.parentId ?? '',
    });
    setSlugTouched(true);
    setFormError(null);
    setFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) return setFormError('Category name is required.');

    const id = editing ? editing.id : form.id.trim();
    if (!editing) {
      if (!id) return setFormError('Slug is required.');
      if (!SLUG_PATTERN.test(id)) {
        return setFormError('Slug may only contain lowercase letters, digits and single hyphens.');
      }
      if (categories.some((c) => c.id === id)) {
        return setFormError(`The slug "${id}" is already used by another category.`);
      }
    }
    const parentId = form.parentId || null;
    const check = checkParent(categories, editing ? id : NEW_ID, parentId);
    if (!check.ok) {
      return setFormError(
        check.reason === 'TOO_DEEP'
          ? `Categories can be at most ${MAX_CATEGORY_DEPTH} levels deep.`
          : check.reason === 'NOT_FOUND'
          ? 'The chosen parent no longer exists.'
          : 'A category can’t be moved under itself or one of its subcategories.'
      );
    }

    setSaving(true);
    setFormError(null);
    const ok = await onSaveCategory(
      {
        id,
        name,
        blurb: form.blurb.trim() || (editing ? '' : 'Farm-fresh grocery aisle'),
        description: form.description.trim(),
        image: form.image.trim() || (editing ? '' : DEFAULT_IMAGE),
        parentId,
      },
      !editing
    );
    setSaving(false);
    if (ok) {
      if (parentId) expand(parentId);
      setFormOpen(false);
    }
  };

  // ---- Row actions -------------------------------------------------------
  const reorder = async (c: Category, direction: -1 | 1) => {
    const plan = moveAmongSiblings(categories, c.id, direction);
    if (!plan || busy) return;
    setBusy(true);
    await onReorderCategories(plan.parentId, plan.ids);
    setBusy(false);
    // The arrow button may now be disabled; keep keyboard focus on the row.
    if (!document.activeElement || document.activeElement === document.body) focusItem(c.id);
  };

  const openMove = (c: Category) => {
    setMoveTarget(c);
    setMoveParent(c.parentId ?? '');
  };

  const confirmMove = async () => {
    if (!moveTarget) return;
    setBusy(true);
    const parentId = moveParent || null;
    const ok = await onMoveCategory(moveTarget, parentId);
    setBusy(false);
    if (ok) {
      if (parentId) expand(parentId);
      setMoveTarget(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    const ok = await onDeleteCategory(deleteTarget.id);
    setBusy(false);
    if (ok) setDeleteTarget(null);
  };

  // ---- Rendering ---------------------------------------------------------
  const renderNodes = (nodes: CategoryNode<Category>[]): React.ReactNode =>
    nodes.map((node, i) => {
      const c = node.category;
      const count = counts.get(c.id) ?? { own: 0, total: 0, children: 0 };
      const hasChildren = node.children.length > 0;
      const expanded = hasChildren && isExpanded(c.id);
      const isActive = activeId === c.id;
      const tab = isActive ? 0 : -1;
      const sib = siblingInfo.get(c.id) ?? { index: 0, count: 1 };
      const depth = depthById.get(c.id) ?? node.depth;

      return (
        <li
          key={c.id}
          ref={(el) => {
            if (el) itemRefs.current.set(c.id, el);
            else itemRefs.current.delete(c.id);
          }}
          role="treeitem"
          data-id={c.id}
          aria-level={node.depth}
          aria-setsize={nodes.length}
          aria-posinset={i + 1}
          aria-expanded={hasChildren ? expanded : undefined}
          aria-selected={isActive}
          aria-label={c.name}
          tabIndex={tab}
          onFocus={(e) => {
            e.stopPropagation();
            setFocusedId(c.id);
          }}
          className="outline-none"
        >
          <div className="flex items-stretch rounded-2xl transition hover:bg-[#f7faf8] [li:focus-visible>&]:ring-2 [li:focus-visible>&]:ring-inset [li:focus-visible>&]:ring-[#1a663b] [li:focus-visible>&]:bg-[#f0f7f2]">
            {/* Indentation guides, one per ancestor level */}
            {Array.from({ length: node.depth - 1 }, (_, g) => (
              <span key={g} aria-hidden className="flex w-6 shrink-0 justify-center">
                <span className="h-full w-px bg-[#d5e6db]" />
              </span>
            ))}

            <div className="flex flex-1 flex-wrap items-center gap-x-3 gap-y-2 py-2.5 pl-1 pr-2 min-w-0">
              {hasChildren ? (
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => toggle(c.id)}
                  disabled={searching}
                  aria-label={expanded ? `Collapse ${c.name}` : `Expand ${c.name}`}
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[#5a7165] hover:bg-[#e8f5ee] transition cursor-pointer disabled:cursor-default"
                >
                  <ChevronRight
                    className={`h-4 w-4 transition-transform ${expanded ? 'rotate-90' : ''}`}
                  />
                </button>
              ) : (
                <span aria-hidden className="h-7 w-7 shrink-0" />
              )}

              {c.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={c.image}
                  alt=""
                  className="h-10 w-10 shrink-0 rounded-xl border border-[#e2efe6] bg-[#f0f7f2] object-cover"
                />
              ) : (
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-dashed border-[#cfe3d6] text-[#7a9485]">
                  <ImageIcon className="h-4 w-4" />
                </span>
              )}

              <div className="min-w-[10rem] flex-1">
                <span className="block text-sm font-bold text-[#112a1d] line-clamp-1">
                  <Highlight text={c.name} query={query} />
                </span>
                <span className="block text-[11px] font-mono text-[#5a7165] line-clamp-1">
                  /<Highlight text={c.id} query={query} />
                  {c.blurb ? (
                    <span className="font-sans"> · {c.blurb}</span>
                  ) : null}
                </span>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-1.5 text-[11px]">
                <span
                  className="rounded-full bg-[#f0f7f2] px-2.5 py-1 font-bold text-[#14522f]"
                  title="Products in this category (and in all of its subcategories)"
                >
                  {count.own} {count.own === 1 ? 'product' : 'products'}
                  {count.total !== count.own && ` (${count.total} incl. subcategories)`}
                </span>
                {count.children > 0 && (
                  <span className="rounded-full bg-[#fef3c7] px-2.5 py-1 font-bold text-[#78350f]">
                    {count.children} {count.children === 1 ? 'subcategory' : 'subcategories'}
                  </span>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-0.5">
                <button
                  type="button"
                  tabIndex={tab}
                  className={iconButtonClass}
                  onClick={() => openAdd(c.id)}
                  disabled={depth >= MAX_CATEGORY_DEPTH}
                  title={
                    depth >= MAX_CATEGORY_DEPTH
                      ? `Categories can be at most ${MAX_CATEGORY_DEPTH} levels deep`
                      : 'Add subcategory'
                  }
                  aria-label={`Add subcategory to ${c.name}`}
                >
                  <FolderPlus className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  tabIndex={tab}
                  className={iconButtonClass}
                  onClick={() => openEdit(c)}
                  title="Edit"
                  aria-label={`Edit ${c.name}`}
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  tabIndex={tab}
                  className={iconButtonClass}
                  onClick={() => openMove(c)}
                  title="Move to another parent"
                  aria-label={`Move ${c.name} to another parent`}
                >
                  <FolderInput className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  tabIndex={tab}
                  className={iconButtonClass}
                  onClick={() => reorder(c, -1)}
                  disabled={busy || sib.index === 0}
                  title="Move up"
                  aria-label={`Move ${c.name} up`}
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  tabIndex={tab}
                  className={iconButtonClass}
                  onClick={() => reorder(c, 1)}
                  disabled={busy || sib.index >= sib.count - 1}
                  title="Move down"
                  aria-label={`Move ${c.name} down`}
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  tabIndex={tab}
                  className={`${iconButtonClass} hover:!bg-red-50 hover:!text-red-600`}
                  onClick={() => setDeleteTarget(c)}
                  title="Delete"
                  aria-label={`Delete ${c.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {expanded && (
            <ul role="group" className="space-y-0.5">
              {renderNodes(node.children)}
            </ul>
          )}
        </li>
      );
    });

  const deleteCounts = deleteTarget ? counts.get(deleteTarget.id) : undefined;
  const deleteBlocker = !deleteCounts
    ? null
    : deleteCounts.children > 0
    ? deleteCounts.children === 1
      ? 'Move or delete its 1 subcategory first.'
      : `Move or delete its ${deleteCounts.children} subcategories first.`
    : deleteCounts.own > 0
    ? `Move or delete ${deleteCounts.own === 1 ? 'the 1 product' : `the ${deleteCounts.own} products`} in this category first.`
    : null;

  const moveOptions = moveTarget ? parentOptions(moveTarget.id) : [];
  const formOptions = parentOptions(editing ? editing.id : null);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-[#112a1d]">
            Grocery Aisles &amp; Categories
          </h2>
          <p className="text-xs text-[#5a7165]">
            {topLevelCount} top-level · {subCount} subcategories · up to {MAX_CATEGORY_DEPTH}{' '}
            levels deep. Products can belong to any level.
          </p>
        </div>

        <Button variant="primary" size="md" onClick={() => openAdd(null)}>
          <Plus className="w-4 h-4" />
          <span>Add Top-Level Category</span>
        </Button>
      </div>

      {categories.length === 0 ? (
        <EmptyState
          icon={<Layers className="w-8 h-8" />}
          title="No categories yet"
          description="Create your first grocery aisle, then add subcategories under it."
          actionLabel="Add Category"
          onAction={() => openAdd(null)}
        />
      ) : (
        <div className="rounded-3xl border border-[#dfece3] bg-white shadow-soft">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3 border-b border-[#e6f0e9] p-4">
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5a7165]" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search categories by name, slug or blurb..."
                aria-label="Search categories"
                className={`${inputClass} pl-10 pr-9`}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-[#5a7165] hover:bg-[#e8f5ee] cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={expandAll} disabled={searching}>
                <ChevronsUpDown className="h-3.5 w-3.5" />
                <span>Expand all</span>
              </Button>
              <Button variant="outline" size="sm" onClick={collapseAll} disabled={searching}>
                <ChevronsDownUp className="h-3.5 w-3.5" />
                <span>Collapse all</span>
              </Button>
            </div>
            {searching && (
              <p className="w-full text-[11px] text-[#5a7165]" aria-live="polite">
                {matchCount} matching {matchCount === 1 ? 'category' : 'categories'} (parents
                shown for context)
              </p>
            )}
          </div>

          <div className="p-3">
            {visibleTree.length === 0 ? (
              <EmptyState
                icon={<Search className="w-8 h-8" />}
                title="No matching categories"
                description={`Nothing matches “${query.trim()}”. Try another name or slug.`}
                actionLabel="Clear search"
                onAction={() => setQuery('')}
              />
            ) : (
              <ul
                role="tree"
                aria-label="Categories"
                onKeyDown={handleTreeKeyDown}
                className="space-y-0.5"
              >
                {renderNodes(visibleTree)}
              </ul>
            )}
          </div>
          <p className="border-t border-[#e6f0e9] px-4 py-2.5 text-[11px] text-[#7a9485]">
            Keyboard: ↑/↓ to move, → to expand, ← to collapse, Enter to edit, Tab for row actions.
          </p>
        </div>
      )}

      {/* Add / Edit Category Modal */}
      <Modal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Edit Category' : form.parentId ? 'Add Subcategory' : 'Create New Category'}
        subtitle={
          editing ? getCategoryPath(categories, editing.id) : 'Slugs are permanent: storefront links use them.'
        }
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="cat-name" className="mb-1 block text-xs font-bold text-[#5a7165]">
                Category Name *
              </label>
              <input
                id="cat-name"
                type="text"
                required
                value={form.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setForm((f) => ({ ...f, name, id: !editing && !slugTouched ? slugify(name) : f.id }));
                }}
                placeholder="e.g. Exotic Fruits & Berries"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="cat-slug" className="mb-1 block text-xs font-bold text-[#5a7165]">
                Slug (URL id) *
              </label>
              <input
                id="cat-slug"
                type="text"
                required
                disabled={!!editing}
                value={form.id}
                onChange={(e) => {
                  setSlugTouched(true);
                  setForm((f) => ({ ...f, id: e.target.value.toLowerCase() }));
                }}
                placeholder="e.g. exotic-fruits"
                aria-describedby="cat-slug-help"
                className={`${inputClass} font-mono disabled:bg-gray-100 disabled:text-[#5a7165]`}
              />
              <p id="cat-slug-help" className="mt-1 text-[11px] text-[#7a9485]">
                {editing
                  ? 'Can’t be changed: storefront links use it.'
                  : 'Filled in from the name. Lowercase letters, digits and hyphens.'}
              </p>
            </div>
          </div>

          <div>
            <label htmlFor="cat-parent" className="mb-1 block text-xs font-bold text-[#5a7165]">
              Parent Category
            </label>
            <ParentSelect
              id="cat-parent"
              value={form.parentId}
              onChange={(parentId) => setForm((f) => ({ ...f, parentId }))}
              options={formOptions}
            />
          </div>

          <div>
            <label htmlFor="cat-blurb" className="mb-1 block text-xs font-bold text-[#5a7165]">
              Short Blurb
            </label>
            <input
              id="cat-blurb"
              type="text"
              value={form.blurb}
              onChange={(e) => setForm((f) => ({ ...f, blurb: e.target.value }))}
              placeholder="e.g. Seasonal & farm-picked delights"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="cat-description" className="mb-1 block text-xs font-bold text-[#5a7165]">
              Description
            </label>
            <textarea
              id="cat-description"
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Shown on the storefront category page."
              className={`${inputClass} p-3`}
            />
          </div>

          <ImageUploadField
            label="Category Image (Cloudinary or Direct URL)"
            value={form.image}
            onChange={(image) => setForm((f) => ({ ...f, image }))}
          />

          {formError && (
            <p role="alert" className="text-xs font-semibold text-red-700">
              {formError}
            </p>
          )}

          <div className="flex justify-end gap-3 border-t border-[#e6f0e9] pt-3">
            <Button type="button" variant="outline" size="sm" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" loading={saving}>
              {editing ? 'Save Changes' : 'Create Category'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Move Modal */}
      <Modal
        isOpen={!!moveTarget}
        onClose={() => setMoveTarget(null)}
        title={moveTarget ? `Move “${moveTarget.name}”` : 'Move Category'}
        subtitle={moveTarget ? `Currently: ${getCategoryPath(categories, moveTarget.id)}` : undefined}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="move-parent" className="mb-1 block text-xs font-bold text-[#5a7165]">
              New parent
            </label>
            <ParentSelect
              id="move-parent"
              value={moveParent}
              onChange={setMoveParent}
              options={moveOptions}
            />
            <p className="mt-1 text-[11px] text-[#7a9485]">
              Its subcategories and products move with it. A category can’t go under itself or
              its own subcategories.
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" size="sm" onClick={() => setMoveTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={busy}
              disabled={!moveTarget || (moveTarget.parentId ?? '') === moveParent}
              onClick={confirmMove}
            >
              Move Category
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Category"
        size="md"
      >
        <div className="space-y-4">
          {deleteBlocker ? (
            <div className="flex items-start gap-2 rounded-2xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <span>
                <strong>{deleteTarget?.name}</strong> can’t be deleted yet. {deleteBlocker}
              </span>
            </div>
          ) : (
            <p className="text-xs text-[#5a7165]">
              Permanently delete <strong>{deleteTarget?.name}</strong>? It has no products or
              subcategories. This can’t be undone.
            </p>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>
              {deleteBlocker ? 'Close' : 'Cancel'}
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={busy}
              disabled={!!deleteBlocker}
              onClick={confirmDelete}
            >
              Confirm Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
