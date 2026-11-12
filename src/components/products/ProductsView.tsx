'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import * as RT from '@radix-ui/react-tabs';
import { createColumnHelper } from '@tanstack/react-table';
import { Eye, EyeOff, FilterX, FolderInput, Leaf, MoreHorizontal, Package, Pencil, Plus, Trash2 } from 'lucide-react';
import type { Product } from '@/types/store';
import type { ProductFilters, ProductsPage } from '@/types/admin';
import { cn } from '@/lib/cn';
import { formatBDT, formatNumber } from '@/lib/format';
import { CATEGORY_PATH_SEPARATOR, getAncestors } from '@/lib/category-tree';
import { LOW_STOCK_THRESHOLD } from '@/lib/constants';
import { useUrlState } from '@/lib/client/use-url-state';
import { useStoreAction } from '@/lib/client/store-action';
import { DataTable } from '@/components/ui/DataTable';
import { TabsContent, TabsList } from '@/components/ui/Tabs';
import { NumberInput, SearchInput } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Checkbox';
import { CategoryTreeSelect } from '@/components/ui/CategoryTreeSelect';
import { Pagination } from '@/components/ui/Pagination';
import { Button, buttonClass } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Kbd, Thumb } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Tooltip } from '@/components/ui/Tooltip';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { Select } from '@/components/ui/Select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';

const col = createColumnHelper<Product>();
type View = 'all' | 'active' | 'hidden' | 'low' | 'out';

function StockCell({ product, onCommit }: { product: Product; onCommit: (stock: number) => void }) {
  const [value, setValue] = useState<number | null>(product.stock);
  const [synced, setSynced] = useState(product.stock);
  if (synced !== product.stock) {
    setSynced(product.stock);
    setValue(product.stock);
  }
  const low = product.stock > 0 && product.stock <= LOW_STOCK_THRESHOLD;
  return (
    <div className="flex items-center gap-2" data-no-row-click>
      <NumberInput
        inputSize="sm"
        className={cn('w-28', product.stock <= 0 && '!border-red-300', low && '!border-amber-300')}
        value={value}
        min={0}
        max={1_000_000}
        steppers={false}
        aria-label={`Stock for ${product.name}`}
        onChange={setValue}
        onBlur={() => value !== null && value !== product.stock && onCommit(value)}
      />
      {product.stock <= 0 ? (
        <span className="text-xs font-semibold text-red-700">Out</span>
      ) : low ? (
        <span className="text-xs font-semibold text-amber-700">Low</span>
      ) : null}
    </div>
  );
}

export function ProductsView({ data, filters }: { data: ProductsPage; filters: ProductFilters }) {
  const { set, reset, isPending } = useUrlState();
  const { run, busy, refreshing } = useStoreAction();
  const confirm = useConfirm();
  const [overrides, setOverrides] = useState<Record<string, Partial<Product>>>({});
  const [prevRows, setPrevRows] = useState(data.rows);
  if (prevRows !== data.rows) {
    setPrevRows(data.rows);
    setOverrides({});
  }
  const rows = useMemo(() => data.rows.map((p) => ({ ...p, ...overrides[p.id] })), [data.rows, overrides]);
  const [moveIds, setMoveIds] = useState<string[] | null>(null);
  const [moveTo, setMoveTo] = useState<string | null>(null);

  const pathOf = useMemo(() => {
    const byId = new Map(data.categories.map((c) => [c.id, c]));
    return (id: string) => {
      const c = byId.get(id);
      if (!c) return id;
      return [...getAncestors(data.categories, id), c].map((x) => x.name).join(CATEGORY_PATH_SEPARATOR);
    };
  }, [data.categories]);

  /** Optimistic single-field change with rollback on failure. */
  const patch = async (p: Product, change: Partial<Product>, action: string, payload: unknown, success: string) => {
    setOverrides((o) => ({ ...o, [p.id]: { ...o[p.id], ...change } }));
    const out = await run(action, payload, { success });
    if (!out.ok) {
      setOverrides((o) => {
        const next = { ...o };
        delete next[p.id];
        return next;
      });
    }
  };

  const removeMany = async (items: Product[], clear?: () => void) => {
    const ok = await confirm({
      title: items.length === 1 ? `Delete “${items[0].name}”?` : `Delete ${items.length} products?`,
      description: 'They disappear from the storefront and the catalog. Past orders keep their own copy of each item. This can’t be undone.',
      confirmLabel: items.length === 1 ? 'Delete product' : `Delete ${items.length} products`,
      tone: 'danger',
      details:
        items.length > 1 ? (
          <ul className="max-h-32 space-y-1 overflow-y-auto rounded-xl bg-mint-25 p-3 text-[13px] text-ink">
            {items.map((i) => (
              <li key={i.id} className="truncate">
                {i.name}
              </li>
            ))}
          </ul>
        ) : undefined,
    });
    if (!ok) return;
    const out =
      items.length === 1
        ? await run('DELETE_PRODUCT', { id: items[0].id }, { success: 'Product deleted' })
        : await run('BULK_DELETE_PRODUCTS', { ids: items.map((i) => i.id) }, { success: `${items.length} products deleted` });
    if (out.ok) clear?.();
  };

  const setActiveMany = async (items: Product[], active: boolean, clear: () => void) => {
    const ok = await confirm({
      title: `${active ? 'Show' : 'Hide'} ${items.length} products?`,
      description: active ? 'They become visible and orderable on the storefront.' : 'Customers will no longer see or order them.',
      confirmLabel: active ? 'Show on storefront' : 'Hide from storefront',
    });
    if (!ok) return;
    const out = await run('BULK_SET_PRODUCTS_ACTIVE', { ids: items.map((i) => i.id), active }, { success: `${items.length} products ${active ? 'shown' : 'hidden'}` });
    if (out.ok) clear();
  };

  const columns = useMemo(
    () => [
      col.accessor('name', {
        id: 'name',
        header: 'Product',
        meta: { alwaysVisible: true, skeleton: 'thumb', className: 'min-w-[260px]' },
        cell: ({ row }) => {
          const p = row.original;
          return (
            <div className="flex items-center gap-3">
              <Thumb src={p.image} className={cn(!p.active && 'opacity-50 grayscale')} />
              <div className="min-w-0">
                <Link href={`/products/${encodeURIComponent(p.id)}`} className="block max-w-[260px] truncate font-medium text-ink hover:text-primary">
                  {p.name}
                </Link>
                <p className="truncate text-[13px] text-muted">
                  {p.unit}
                  {p.sku ? ` · ${p.sku}` : ''}
                </p>
              </div>
            </div>
          );
        },
      }),
      col.accessor('category', {
        id: 'category',
        header: 'Category',
        enableSorting: false,
        meta: { label: 'Category', skeleton: 'text' },
        cell: ({ getValue }) => {
          const path = pathOf(getValue());
          return (
            <Tooltip content={path}>
              <span tabIndex={0} className="block max-w-[200px] truncate text-muted">
                {path}
              </span>
            </Tooltip>
          );
        },
      }),
      col.accessor('price', {
        id: 'price',
        header: 'Price',
        meta: { label: 'Price', align: 'right', skeleton: 'number', sortDescFirst: true },
        cell: ({ row }) => (
          <div className="text-right">
            <p className="tabular font-semibold text-ink">{formatBDT(row.original.price)}</p>
            {row.original.oldPrice ? <p className="tabular text-[13px] text-muted line-through">{formatBDT(row.original.oldPrice)}</p> : null}
          </div>
        ),
      }),
      col.accessor('stock', {
        id: 'stock',
        header: 'Stock',
        meta: { label: 'Stock', skeleton: 'text', className: 'w-[170px]' },
        cell: ({ row }) => (
          <StockCell
            product={row.original}
            onCommit={(stock) => patch(row.original, { stock }, 'QUICK_STOCK_UPDATE', { id: row.original.id, stock }, `Stock set to ${stock}`)}
          />
        ),
      }),
      col.accessor((p) => p.soldCount ?? 0, {
        id: 'sold_count',
        header: 'Sold',
        meta: { label: 'Sold', align: 'right', skeleton: 'number', sortDescFirst: true, defaultHidden: false },
        cell: ({ getValue }) => <span className="tabular text-muted">{formatNumber(getValue())}</span>,
      }),
      col.accessor('active', {
        id: 'active',
        header: 'Active',
        enableSorting: false,
        meta: { label: 'Active', align: 'center', skeleton: 'switch' },
        cell: ({ row }) => (
          <Switch
            checked={row.original.active}
            aria-label={`${row.original.name} visible on storefront`}
            onCheckedChange={(active) =>
              patch(row.original, { active }, 'TOGGLE_PRODUCT_ACTIVE', { id: row.original.id, active }, active ? 'Product is live' : 'Product hidden')
            }
          />
        ),
      }),
      col.accessor('featured', {
        id: 'featured',
        header: 'Featured',
        enableSorting: false,
        meta: { label: 'Featured', align: 'center', skeleton: 'switch' },
        cell: ({ row }) => (
          <Switch
            checked={row.original.featured}
            aria-label={`${row.original.name} featured`}
            onCheckedChange={(featured) =>
              patch(row.original, { featured }, 'TOGGLE_PRODUCT_FEATURED', { id: row.original.id, featured }, featured ? 'Added to featured' : 'Removed from featured')
            }
          />
        ),
      }),
      col.display({
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        enableHiding: false,
        meta: { alwaysVisible: true, align: 'right', skeleton: 'actions', className: 'w-14' },
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${row.original.name}`}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-52">
              <DropdownMenuItem asChild>
                <Link href={`/products/${encodeURIComponent(row.original.id)}`}>
                  <Pencil /> Edit product
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setMoveIds([row.original.id])}>
                <FolderInput /> Move to category
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem tone="danger" onSelect={() => removeMany([row.original])}>
                <Trash2 /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pathOf]
  );

  const view: View = filters.stock === 'low' ? 'low' : filters.stock === 'out' ? 'out' : filters.status === 'all' ? 'all' : filters.status;
  const setView = (v: View) =>
    set({
      status: v === 'active' || v === 'hidden' ? v : null,
      stock: v === 'low' || v === 'out' ? v : null,
    });
  const activeFilters = !!filters.q || !!filters.category || filters.featured || filters.stock === 'in';
  const totals = new Map(Object.entries(data.categoryTotals));

  return (
    <>
      <RT.Root value={view} onValueChange={(v) => setView(v as View)}>
        <TabsList
          className="mb-4"
          aria-label="Product views"
          value={view}
          items={[
            { value: 'all', label: 'All', count: data.counts.all },
            { value: 'active', label: 'Active', count: data.counts.active },
            { value: 'hidden', label: 'Hidden', count: data.counts.hidden },
            { value: 'low', label: 'Low stock', count: data.counts.low },
            { value: 'out', label: 'Out of stock', count: data.counts.out, tone: 'danger' },
          ]}
        />
        <TabsContent value={view} className="outline-none" tabIndex={-1}>
          <DataTable
            tableId="products"
            caption="Products"
            data={rows}
            columns={columns}
            getRowId={(p) => p.id}
            rowHref={(p) => `/products/${encodeURIComponent(p.id)}`}
            loading={isPending || refreshing}
            skeletonRows={Math.min(filters.pageSize, 10)}
            sort={{ id: filters.sort, desc: filters.dir === 'desc' }}
            onSortChange={(s) => set({ sort: s ? s.id : null, dir: s ? (s.desc ? 'desc' : 'asc') : null })}
            selectable
            scrollKey={filters.page}
            bulkActions={(items, clear) => (
              <>
                <Button variant="secondary" size="sm" disabled={busy} onClick={() => setActiveMany(items, true, clear)}>
                  <Eye className="h-4 w-4" /> Show
                </Button>
                <Button variant="secondary" size="sm" disabled={busy} onClick={() => setActiveMany(items, false, clear)}>
                  <EyeOff className="h-4 w-4" /> Hide
                </Button>
                <Button variant="secondary" size="sm" disabled={busy} onClick={() => setMoveIds(items.map((i) => i.id))}>
                  <FolderInput className="h-4 w-4" /> Move
                </Button>
                <Button variant="danger" size="sm" disabled={busy} onClick={() => removeMany(items, clear)}>
                  <Trash2 className="h-4 w-4" /> Delete
                </Button>
              </>
            )}
            toolbar={
              <>
                <SearchInput
                  data-page-search
                  value={filters.q}
                  debounce={300}
                  onChange={(q) => set({ q })}
                  placeholder="Search name, SKU or slug…"
                  aria-label="Search products"
                  className="w-full min-w-60 flex-1 sm:max-w-sm"
                  hint={<Kbd className="mr-1">/</Kbd>}
                />
                <CategoryTreeSelect
                  className="w-64"
                  categories={data.categories}
                  counts={totals}
                  value={filters.category || null}
                  onChange={(id) => set({ category: id })}
                  noneLabel="All categories"
                  aria-label="Filter by category"
                />
                <Select
                  className="w-40"
                  searchable={false}
                  aria-label="Stock level"
                  value={filters.stock === 'in' ? 'in' : 'any'}
                  onChange={(v) => set({ stock: v === 'in' ? 'in' : null })}
                  options={[
                    { value: 'any', label: 'Any stock' },
                    { value: 'in', label: `More than ${LOW_STOCK_THRESHOLD}` },
                  ]}
                />
                <button
                  type="button"
                  aria-pressed={filters.featured}
                  onClick={() => set({ featured: !filters.featured })}
                  className={cn(
                    'inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border px-3.5 text-sm font-medium transition',
                    filters.featured ? 'border-primary/50 bg-mint text-primary-600' : 'border-line-strong bg-white text-ink hover:bg-mint-50'
                  )}
                >
                  <Leaf className="h-4 w-4" /> Featured
                </button>
                {activeFilters && (
                  <Button variant="ghost" size="md" onClick={() => reset(['sort', 'dir', 'size', 'status'])}>
                    <FilterX className="h-4 w-4" /> Clear
                  </Button>
                )}
              </>
            }
            empty={
              <EmptyState
                icon={<Package className="h-6 w-6" />}
                title={activeFilters || view !== 'all' ? 'No products match' : 'No products yet'}
                description={activeFilters ? 'Try another search, category or filter.' : 'Add your first product to start selling.'}
                action={
                  <Link href="/products/new" className={buttonClass('primary', 'sm', 'mt-5')}>
                    <Plus className="h-4 w-4" /> Add product
                  </Link>
                }
              />
            }
            mobileCard={(p) => (
              <div className="flex gap-3 p-4 pr-12">
                <Thumb src={p.image} className="h-14 w-14" />
                <div className="min-w-0 flex-1 space-y-1">
                  <Link href={`/products/${encodeURIComponent(p.id)}`} className="block truncate font-medium text-ink">
                    {p.name}
                  </Link>
                  <p className="truncate text-[13px] text-muted">{pathOf(p.category)}</p>
                  <div className="flex items-center justify-between">
                    <span className="tabular font-semibold text-ink">{formatBDT(p.price)}</span>
                    <span className={cn('tabular text-[13px] font-semibold', p.stock <= 0 ? 'text-red-700' : p.stock <= LOW_STOCK_THRESHOLD ? 'text-amber-700' : 'text-muted')}>
                      {p.stock} in stock
                    </span>
                  </div>
                </div>
              </div>
            )}
            footer={
              <Pagination
                className="border-t border-line"
                page={filters.page}
                pageSize={filters.pageSize}
                total={data.total}
                noun="products"
                onPageChange={(page) => set({ page: page > 1 ? page : null }, { keepPage: true })}
                onPageSizeChange={(size) => set({ size })}
              />
            }
          />
        </TabsContent>
      </RT.Root>

      <Modal
        isOpen={!!moveIds}
        onClose={() => setMoveIds(null)}
        title={moveIds && moveIds.length > 1 ? `Move ${moveIds.length} products` : 'Move product'}
        subtitle="Pick any level of the category tree."
        size="md"
        icon={<FolderInput className="h-5 w-5" />}
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setMoveIds(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!moveTo}
              loading={busy}
              onClick={async () => {
                if (!moveIds || !moveTo) return;
                const out = await run('BULK_SET_PRODUCTS_CATEGORY', { ids: moveIds, category: moveTo }, { success: `Moved to ${pathOf(moveTo)}` });
                if (out.ok) {
                  setMoveIds(null);
                  setMoveTo(null);
                }
              }}
            >
              Move
            </Button>
          </>
        }
      >
        <CategoryTreeSelect categories={data.categories} counts={totals} value={moveTo} onChange={setMoveTo} aria-label="New category" placeholder="Choose the new category" />
      </Modal>
    </>
  );
}
