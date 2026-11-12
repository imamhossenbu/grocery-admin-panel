'use client';

import React, { useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ChevronsDownUp,
  ChevronsUpDown,
  FolderInput,
  FolderPlus,
  FolderTree,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import type { Category, Product } from '@/types/store';
import { slugify } from '@/lib/slug';
import { cn } from '@/lib/cn';
import {
  MAX_CATEGORY_DEPTH,
  buildCategoryTree,
  categoryMatches,
  checkParent,
  countByCategory,
  filterCategoryTree,
  flattenTree,
  getCategoryPath,
  getDepth,
  getSiblings,
  moveAmongSiblings,
  type CategoryNode,
} from '@/lib/category-tree';
import { useStoreAction } from '@/lib/client/store-action';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Drawer, Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { Field, Input, SearchInput, Textarea } from '@/components/ui/Input';
import { ImageUploadField } from '@/components/ui/ImageUploadField';
import { CategoryTreeSelect } from '@/components/ui/CategoryTreeSelect';
import { CategoryThumb, Highlight, TreeChevron, TreeCollapse, treeIndent } from '@/components/ui/CategoryTree';
import { Tooltip } from '@/components/ui/Tooltip';
import { Kbd } from '@/components/ui/Card';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
/** Placeholder id used to check where a not-yet-created category may go. */
const NEW_ID = '\u0000new';

const formSchema = z.object({
  name: z.string().trim().min(1, 'Category name is required.').max(200),
  id: z.string().trim().max(100),
  parentId: z.string(),
  blurb: z.string().trim().max(500),
  description: z.string().max(5000),
  image: z.string().trim().max(2000),
});
type FormValues = z.infer<typeof formSchema>;

const iconBtn =
  'grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-lg text-muted transition hover:bg-mint hover:text-primary active:scale-90 disabled:pointer-events-none disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40';

export function CategoriesView({
  categories,
  products,
  addUnder,
}: {
  categories: Category[];
  products: Pick<Product, 'id' | 'category'>[];
  /** Open the "add" form under this parent on load (?add=<id>, '' = top level). */
  addUnder: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { run, busy } = useStoreAction();
  const confirm = useConfirm();
  const [query, setQuery] = useState('');
  // Parents start collapsed: only top-level categories are visible at first.
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set());
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const itemRefs = useRef(new Map<string, HTMLLIElement>());

  const [formOpen, setFormOpen] = useState(addUnder !== null);
  const [editing, setEditing] = useState<Category | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [moveTarget, setMoveTarget] = useState<Category | null>(null);
  const [moveParent, setMoveParent] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '', id: '', parentId: addUnder ?? '', blurb: '', description: '', image: '' },
  });

  const tree = useMemo(() => buildCategoryTree(categories), [categories]);
  const counts = useMemo(() => countByCategory(categories, products), [categories, products]);
  const totals = useMemo(() => new Map([...counts].map(([k, v]) => [k, v.total])), [counts]);
  const searching = query.trim().length > 0;
  const visibleTree = useMemo(() => (searching ? filterCategoryTree(tree, query) : tree), [tree, query, searching]);
  const isExpanded = (id: string) => searching || openIds.has(id);
  const visible = flattenTree(visibleTree, isExpanded);
  const parentIds = useMemo(() => new Set(categories.map((c) => c.parentId).filter((p): p is string => !!p)), [categories]);
  const siblingInfo = useMemo(() => {
    const info = new Map<string, { index: number; count: number }>();
    for (const c of categories) {
      if (info.has(c.id)) continue;
      const { siblings } = getSiblings(categories, c.id);
      siblings.forEach((s, index) => info.set(s.id, { index, count: siblings.length }));
    }
    return info;
  }, [categories]);
  const depthById = useMemo(() => new Map(categories.map((c) => [c.id, getDepth(categories, c.id)])), [categories]);

  const topLevel = tree.length;
  const matchCount = searching ? categories.filter((c) => categoryMatches(c, query)).length : 0;
  const activeId = focusedId && visible.some((v) => v.category.id === focusedId) ? focusedId : visible[0]?.category.id ?? null;

  const toggle = (id: string) =>
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const expand = (id: string) => setOpenIds((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));

  const focusItem = (id: string | undefined) => {
    if (!id) return;
    setFocusedId(id);
    itemRefs.current.get(id)?.focus();
  };

  const onTreeKeyDown = (e: React.KeyboardEvent<HTMLUListElement>) => {
    const target = e.target as HTMLElement;
    if (target.getAttribute('role') !== 'treeitem') return;
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

  // ---- Form ----------------------------------------------------------------
  const clearAddParam = () => {
    if (addUnder !== null) router.replace(pathname, { scroll: false });
  };

  const openAdd = (parentId: string | null) => {
    setEditing(null);
    setSlugTouched(false);
    form.reset({ name: '', id: '', parentId: parentId ?? '', blurb: '', description: '', image: '' });
    setFormOpen(true);
  };

  function openEdit(c: Category) {
    setEditing(c);
    setSlugTouched(true);
    form.reset({ name: c.name, id: c.id, parentId: c.parentId ?? '', blurb: c.blurb ?? '', description: c.description ?? '', image: c.image ?? '' });
    setFormOpen(true);
  }

  const closeForm = () => {
    setFormOpen(false);
    clearAddParam();
  };

  const submit = form.handleSubmit(async (v) => {
    const id = editing ? editing.id : v.id.trim();
    if (!editing) {
      if (!id) return form.setError('id', { message: 'Slug is required.' });
      if (!SLUG.test(id)) return form.setError('id', { message: 'Only lowercase letters, digits and single hyphens.' });
      if (categories.some((c) => c.id === id)) return form.setError('id', { message: `“${id}” is already used by another category.` });
    }
    const parentId = v.parentId || null;
    const check = checkParent(categories, editing ? id : NEW_ID, parentId);
    if (!check.ok) {
      return form.setError('parentId', {
        message:
          check.reason === 'TOO_DEEP'
            ? `Categories can be at most ${MAX_CATEGORY_DEPTH} levels deep.`
            : check.reason === 'NOT_FOUND'
              ? 'The chosen parent no longer exists.'
              : 'A category can’t be moved under itself or one of its subcategories.',
      });
    }
    const out = await run(
      'SAVE_CATEGORY',
      { id, name: v.name.trim(), blurb: v.blurb.trim(), image: v.image.trim(), description: v.description.trim(), parentId, isNew: !editing },
      { success: editing ? 'Category saved' : 'Category created', successDetail: v.name.trim() }
    );
    if (out.ok) {
      if (parentId) expand(parentId);
      closeForm();
    }
  });

  // ---- Row actions ---------------------------------------------------------
  const reorder = async (c: Category, direction: -1 | 1) => {
    const plan = moveAmongSiblings(categories, c.id, direction);
    if (!plan || busy) return;
    await run('REORDER_CATEGORIES', plan, { success: 'Order updated' });
    focusItem(c.id);
  };

  const confirmMove = async () => {
    if (!moveTarget) return;
    const out = await run('SAVE_CATEGORY', { id: moveTarget.id, name: moveTarget.name, parentId: moveParent, isNew: false }, { success: `“${moveTarget.name}” moved` });
    if (out.ok) {
      if (moveParent) expand(moveParent);
      setMoveTarget(null);
    }
  };

  const remove = async (c: Category) => {
    const cnt = counts.get(c.id);
    const blocker = !cnt
      ? null
      : cnt.children > 0
        ? `Move or delete its ${cnt.children === 1 ? 'subcategory' : `${cnt.children} subcategories`} first.`
        : cnt.own > 0
          ? `Move or delete the ${cnt.own === 1 ? 'product' : `${cnt.own} products`} in it first.`
          : null;
    if (blocker) {
      await confirm({ title: `“${c.name}” can’t be deleted yet`, description: blocker, confirmLabel: 'OK', cancelLabel: 'Close' });
      return;
    }
    const ok = await confirm({
      title: `Delete “${c.name}”?`,
      description: 'It has no products or subcategories. Storefront links to it will stop working. This can’t be undone.',
      confirmLabel: 'Delete category',
      tone: 'danger',
    });
    if (ok) await run('DELETE_CATEGORY', { id: c.id }, { success: 'Category deleted' });
  };

  // ---- Rendering -----------------------------------------------------------
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
      const isParent = hasChildren || node.depth === 1;

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
          <div
            onClick={(e) => {
              if (hasChildren && !(e.target as HTMLElement).closest('button,a,[role="menuitem"]') && !searching) toggle(c.id);
            }}
            style={{ paddingLeft: treeIndent(node.depth, 8) }}
            className={cn(
              'group flex min-h-14 items-center gap-3 rounded-xl pr-2 transition-colors duration-150 hover:bg-mint-25',
              hasChildren && 'cursor-pointer',
              '[li:focus-visible>&]:bg-mint-50 [li:focus-visible>&]:ring-2 [li:focus-visible>&]:ring-inset [li:focus-visible>&]:ring-primary/50'
            )}
          >
            <TreeChevron expanded={expanded} hasChildren={hasChildren} onToggle={() => toggle(c.id)} disabled={searching} label={expanded ? `Collapse ${c.name}` : `Expand ${c.name}`} />
            <CategoryThumb src={c.image} isParent={isParent} size={node.depth === 1 ? 'lg' : 'md'} />
            <div className="min-w-0 flex-1 py-2">
              <p className={cn('truncate text-sm text-ink', isParent ? 'font-semibold' : 'font-normal')}>
                <Highlight text={c.name} query={query} />
              </p>
              <p className="truncate text-[13px] text-muted">
                /<Highlight text={c.id} query={query} />
                {c.blurb ? ` · ${c.blurb}` : ''}
              </p>
            </div>
            <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
              {count.children > 0 && (
                <span className="rounded-full bg-[#fef5dc] px-2.5 py-0.5 text-xs font-semibold text-[#7a4b06]">
                  {count.children} {count.children === 1 ? 'sub' : 'subs'}
                </span>
              )}
              <Tooltip content={count.total !== count.own ? `${count.own} directly · ${count.total} including subcategories` : `${count.own} products`}>
                <span tabIndex={-1} className="tabular rounded-full bg-[#eef3f0] px-2.5 py-0.5 text-xs font-medium text-muted">
                  {count.total} {count.total === 1 ? 'product' : 'products'}
                </span>
              </Tooltip>
            </div>
            <div className="flex shrink-0 items-center opacity-100 transition-opacity lg:opacity-60 lg:group-hover:opacity-100 [li:focus-within>div>&]:opacity-100">
              <Tooltip content="Move up">
                <button type="button" tabIndex={tab} className={cn(iconBtn, 'hidden md:grid')} onClick={() => reorder(c, -1)} disabled={busy || sib.index === 0} aria-label={`Move ${c.name} up`}>
                  <ArrowUp className="h-4 w-4" />
                </button>
              </Tooltip>
              <Tooltip content="Move down">
                <button type="button" tabIndex={tab} className={cn(iconBtn, 'hidden md:grid')} onClick={() => reorder(c, 1)} disabled={busy || sib.index >= sib.count - 1} aria-label={`Move ${c.name} down`}>
                  <ArrowDown className="h-4 w-4" />
                </button>
              </Tooltip>
              <Tooltip content={depth >= MAX_CATEGORY_DEPTH ? `At most ${MAX_CATEGORY_DEPTH} levels` : 'Add subcategory'}>
                <span>
                  <button type="button" tabIndex={tab} className={iconBtn} onClick={() => openAdd(c.id)} disabled={depth >= MAX_CATEGORY_DEPTH} aria-label={`Add subcategory to ${c.name}`}>
                    <FolderPlus className="h-4 w-4" />
                  </button>
                </span>
              </Tooltip>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" tabIndex={tab} className={iconBtn} aria-label={`More actions for ${c.name}`}>
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-52">
                  <DropdownMenuItem onSelect={() => openEdit(c)}>
                    <Pencil /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => {
                      setMoveTarget(c);
                      setMoveParent(c.parentId ?? null);
                    }}
                  >
                    <FolderInput /> Move to…
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => reorder(c, -1)} disabled={sib.index === 0}>
                    <ArrowUp /> Move up
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => reorder(c, 1)} disabled={sib.index >= sib.count - 1}>
                    <ArrowDown /> Move down
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem tone="danger" onSelect={() => remove(c)}>
                    <Trash2 /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          {hasChildren && <TreeCollapse open={expanded}>{renderNodes(node.children)}</TreeCollapse>}
        </li>
      );
    });

  const parentId = form.watch('parentId');
  const name = form.watch('name');
  const errors = form.formState.errors;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-[75ch]">
          <h1 className="font-display text-[28px] font-semibold leading-tight text-ink">Categories</h1>
          <p className="mt-1 text-sm text-muted">
            {topLevel} top-level · {categories.length - topLevel} subcategories · up to {MAX_CATEGORY_DEPTH} levels. Products can belong to any level.
          </p>
        </div>
        <Button onClick={() => openAdd(null)}>
          <Plus className="h-4 w-4" /> Add category
        </Button>
      </div>

      {categories.length === 0 ? (
        <Card>
          <EmptyState icon={<FolderTree className="h-6 w-6" />} title="No categories yet" description="Create your first aisle, then add subcategories under it." actionLabel="Add category" onAction={() => openAdd(null)} />
        </Card>
      ) : (
        <Card>
          <div className="flex flex-wrap items-center gap-2.5 border-b border-line p-4">
            <SearchInput
              data-page-search
              value={query}
              onChange={setQuery}
              placeholder="Search by name, slug or blurb…"
              aria-label="Search categories"
              className="w-full sm:w-80"
              hint={<Kbd className="mr-1">/</Kbd>}
            />
            <div className="ml-auto flex gap-2">
              <Button variant="outline" size="sm" className="h-9" onClick={() => setOpenIds(new Set(parentIds))} disabled={searching}>
                <ChevronsUpDown className="h-4 w-4" /> Expand all
              </Button>
              <Button variant="outline" size="sm" className="h-9" onClick={() => setOpenIds(new Set())} disabled={searching}>
                <ChevronsDownUp className="h-4 w-4" /> Collapse all
              </Button>
            </div>
            {searching && (
              <p className="w-full text-[13px] text-muted" aria-live="polite">
                {matchCount} matching {matchCount === 1 ? 'category' : 'categories'} · parents shown for context
              </p>
            )}
          </div>
          <div className="p-2 sm:p-3">
            {visibleTree.length === 0 ? (
              <EmptyState compact icon={<Search className="h-6 w-6" />} title="No matching categories" description={`Nothing matches “${query.trim()}”.`} actionLabel="Clear search" onAction={() => setQuery('')} />
            ) : (
              <ul role="tree" aria-label="Categories" onKeyDown={onTreeKeyDown} className="space-y-0.5">
                {renderNodes(visibleTree)}
              </ul>
            )}
          </div>
          <p className="border-t border-line px-4 py-3 text-[13px] text-muted">
            Click a parent row or its arrow to open it. Keyboard: ↑ ↓ move · → open · ← close · Enter edit · Tab for row actions.
          </p>
        </Card>
      )}

      {/* Add / edit */}
      <Drawer
        isOpen={formOpen}
        onClose={closeForm}
        title={editing ? 'Edit category' : parentId ? 'Add subcategory' : 'New category'}
        subtitle={editing ? getCategoryPath(categories, editing.id) : 'Slugs are permanent: storefront links use them.'}
        width="max-w-xl"
        footer={
          <>
            <Button variant="outline" onClick={closeForm}>
              Cancel
            </Button>
            <Button onClick={submit} loading={busy}>
              {editing ? 'Save changes' : 'Create category'}
            </Button>
          </>
        }
      >
        <form onSubmit={submit} className="space-y-5" noValidate>
          <Field label="Name" required error={errors.name?.message}>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                aria-describedby={describedBy}
                aria-invalid={invalid}
                placeholder="e.g. Exotic fruits"
                {...form.register('name', {
                  onChange: (e) => {
                    if (!editing && !slugTouched) form.setValue('id', slugify(e.target.value));
                  },
                })}
              />
            )}
          </Field>
          <Field
            label="Slug (URL id)"
            required={!editing}
            error={errors.id?.message}
            help={editing ? 'Can’t be changed: storefront links use it.' : `Storefront link: /category/${form.watch('id') || slugify(name || '') || 'slug'}`}
          >
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                aria-describedby={describedBy}
                aria-invalid={invalid}
                readOnly={!!editing}
                prefix="/"
                placeholder="exotic-fruits"
                {...form.register('id', {
                  onChange: (e) => {
                    setSlugTouched(true);
                    form.setValue('id', e.target.value.toLowerCase());
                  },
                })}
              />
            )}
          </Field>
          <Field label="Parent category" error={errors.parentId?.message} help="Leave as top level for a main aisle.">
            {({ id, describedBy, invalid }) => (
              <Controller
                control={form.control}
                name="parentId"
                render={({ field }) => (
                  <CategoryTreeSelect
                    id={id}
                    aria-describedby={describedBy}
                    aria-invalid={invalid}
                    categories={categories}
                    counts={totals}
                    value={field.value || null}
                    onChange={(v) => field.onChange(v ?? '')}
                    noneLabel="None (top level)"
                    excludeSubtreeOf={editing?.id}
                    disabledReason={(c) => (checkParent(categories, editing ? editing.id : NEW_ID, c.id).ok ? null : `Too deep: max ${MAX_CATEGORY_DEPTH} levels`)}
                  />
                )}
              />
            )}
          </Field>
          <Field label="Short blurb" optional error={errors.blurb?.message}>
            {({ id, describedBy }) => <Input id={id} aria-describedby={describedBy} placeholder="e.g. Seasonal & farm-picked" {...form.register('blurb')} />}
          </Field>
          <Field label="Description" optional help="Shown on the storefront category page.">
            {({ id, describedBy }) => (
              <Controller
                control={form.control}
                name="description"
                render={({ field }) => <Textarea id={id} aria-describedby={describedBy} maxLength={5000} value={field.value} onChange={field.onChange} />}
              />
            )}
          </Field>
          <Controller control={form.control} name="image" render={({ field }) => <ImageUploadField label="Image" value={field.value} onChange={field.onChange} />} />
        </form>
      </Drawer>

      {/* Move */}
      <Modal
        isOpen={!!moveTarget}
        onClose={() => setMoveTarget(null)}
        title={moveTarget ? `Move “${moveTarget.name}”` : 'Move category'}
        subtitle={moveTarget ? `Currently: ${getCategoryPath(categories, moveTarget.id)}` : undefined}
        size="md"
        icon={<FolderInput className="h-5 w-5" />}
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setMoveTarget(null)}>
              Cancel
            </Button>
            <Button size="sm" loading={busy} disabled={!moveTarget || (moveTarget.parentId ?? null) === moveParent} onClick={confirmMove}>
              Move category
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <CategoryTreeSelect
            categories={categories}
            counts={totals}
            value={moveParent}
            onChange={setMoveParent}
            noneLabel="None (top level)"
            excludeSubtreeOf={moveTarget?.id}
            disabledReason={(c) => (moveTarget && !checkParent(categories, moveTarget.id, c.id).ok ? `Too deep: max ${MAX_CATEGORY_DEPTH} levels` : null)}
            aria-label="New parent"
          />
          <p className="flex items-start gap-2 text-[13px] text-muted">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            Its subcategories and products move with it.
          </p>
        </div>
      </Modal>
    </>
  );
}
