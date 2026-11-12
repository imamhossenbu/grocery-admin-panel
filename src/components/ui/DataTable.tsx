'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type RowSelectionState,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ChevronsUpDown, Columns3, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useLocalStorage } from '@/lib/client/use-local-storage';
import { Checkbox } from './Checkbox';
import { Skeleton } from './Skeleton';
import { Button } from './Button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './DropdownMenu';

// Column metadata understood by DataTable (set via `meta` on a ColumnDef).
export interface ColumnMeta {
  /** Name in the column-visibility menu (defaults to the header string). */
  label?: string;
  align?: 'left' | 'right' | 'center';
  /** Extra classes for td/th (e.g. widths). */
  className?: string;
  /** Shape of the skeleton cell while loading. */
  skeleton?: 'text' | 'thumb' | 'badge' | 'number' | 'avatar' | 'switch' | 'actions';
  /** Can't be hidden from the column menu. */
  alwaysVisible?: boolean;
  /** Starts hidden. */
  defaultHidden?: boolean;
  /** First click sorts descending (numbers, dates). */
  sortDescFirst?: boolean;
}

declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData, TValue> {
    label?: string;
    align?: 'left' | 'right' | 'center';
    className?: string;
    skeleton?: 'text' | 'thumb' | 'badge' | 'number' | 'avatar' | 'switch' | 'actions';
    alwaysVisible?: boolean;
    defaultHidden?: boolean;
    sortDescFirst?: boolean;
  }
}

export interface DataTableProps<T> {
  /** Used to remember column visibility per table. */
  tableId: string;
  data: T[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: ColumnDef<T, any>[];
  getRowId: (row: T) => string;
  /** Server-side sorting (column id = sort key). */
  sort?: { id: string; desc: boolean } | null;
  onSortChange?: (sort: { id: string; desc: boolean } | null) => void;
  /** Row checkboxes + bulk action bar. */
  selectable?: boolean;
  bulkActions?: (rows: T[], clear: () => void) => React.ReactNode;
  /** Shows skeleton rows (e.g. while the next page/filter loads). */
  loading?: boolean;
  skeletonRows?: number;
  toolbar?: React.ReactNode;
  /** Right-aligned toolbar actions (e.g. Export), grouped with the Columns menu. */
  toolbarEnd?: React.ReactNode;
  empty?: React.ReactNode;
  footer?: React.ReactNode;
  /** Whole row navigates here on click (the primary cell should also hold a real link). */
  rowHref?: (row: T) => string;
  /** Mobile (< md) card renderer; without it the table scrolls horizontally. */
  mobileCard?: (row: T) => React.ReactNode;
  rowClassName?: (row: T) => string | undefined;
  /** When this changes (e.g. page number), scroll the table top into view. */
  scrollKey?: string | number;
  caption: string;
}

function SkeletonCell({ kind = 'text', align }: { kind?: ColumnMeta['skeleton']; align?: string }) {
  const justify = align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : '';
  switch (kind) {
    case 'thumb':
      return (
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
          <div className="w-full max-w-44 space-y-1.5">
            <Skeleton className="h-3.5 w-11/12" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      );
    case 'avatar':
      return (
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
          <div className="w-full max-w-40 space-y-1.5">
            <Skeleton className="h-3.5 w-10/12" />
            <Skeleton className="h-3 w-7/12" />
          </div>
        </div>
      );
    case 'badge':
      return <div className={cn('flex', justify)}><Skeleton className="h-6 w-24 rounded-full" /></div>;
    case 'number':
      return <div className="flex justify-end"><Skeleton className="h-3.5 w-16" /></div>;
    case 'switch':
      return <div className={cn('flex', justify)}><Skeleton className="h-6 w-11 rounded-full" /></div>;
    case 'actions':
      return <div className="flex justify-end"><Skeleton className="h-8 w-8 rounded-lg" /></div>;
    default:
      return <div className={cn('flex', justify)}><Skeleton className="h-3.5 w-full max-w-36" /></div>;
  }
}

const isInteractive = (el: HTMLElement | null) =>
  !!el?.closest('a,button,input,textarea,select,label,[role="checkbox"],[role="switch"],[role="combobox"],[role="menuitem"],[data-no-row-click]');

export function DataTable<T>({
  tableId,
  data,
  columns,
  getRowId,
  sort,
  onSortChange,
  selectable = false,
  bulkActions,
  loading = false,
  skeletonRows = 8,
  toolbar,
  toolbarEnd,
  empty,
  footer,
  rowHref,
  mobileCard,
  rowClassName,
  scrollKey,
  caption,
}: DataTableProps<T>) {
  const router = useRouter();
  const topRef = useRef<HTMLDivElement>(null);

  const defaultVisibility = useMemo(() => {
    const v: VisibilityState = {};
    for (const c of columns) if (c.id && c.meta?.defaultHidden) v[c.id] = false;
    return v;
  }, [columns]);
  const [visibility, setVisibility] = useLocalStorage<VisibilityState>(`fb-admin:cols:${tableId}`, defaultVisibility);

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  // Drop selections for rows that are no longer on screen (new page / filter).
  const [prevData, setPrevData] = useState(data);
  if (prevData !== data) {
    setPrevData(data);
    const ids = new Set(data.map(getRowId));
    const kept = Object.fromEntries(Object.entries(rowSelection).filter(([k, v]) => v && ids.has(k)));
    if (Object.keys(kept).length !== Object.keys(rowSelection).length) setRowSelection(kept);
  }

  const sorting: SortingState = sort ? [{ id: sort.id, desc: sort.desc }] : [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allColumns = useMemo<ColumnDef<T, any>[]>(() => {
    if (!selectable) return columns;
    return [
      {
        id: '__select',
        enableSorting: false,
        enableHiding: false,
        meta: { className: 'w-14 px-0', alwaysVisible: true, skeleton: 'switch', align: 'center' },
        header: ({ table }) => (
          <span className="flex justify-center">
            <Checkbox
              aria-label="Select all rows on this page"
              checked={table.getIsAllRowsSelected() ? true : table.getIsSomeRowsSelected() ? 'indeterminate' : false}
              onCheckedChange={(v) => table.toggleAllRowsSelected(v === true)}
            />
          </span>
        ),
        cell: ({ row }) => (
          <span className="flex justify-center">
            <Checkbox aria-label="Select row" checked={row.getIsSelected()} onCheckedChange={(v) => row.toggleSelected(v === true)} />
          </span>
        ),
      },
      ...columns,
    ];
  }, [columns, selectable]);

  // TanStack Table returns non-memoizable functions by design; the React
  // Compiler lint rule is aware of this library.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns: allColumns,
    getRowId,
    state: { sorting, rowSelection, columnVisibility: visibility },
    manualSorting: true,
    manualPagination: true,
    enableRowSelection: selectable,
    enableSortingRemoval: true,
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: (updater) => setVisibility(typeof updater === 'function' ? updater(visibility) : updater),
    onSortingChange: (updater) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater;
      onSortChange?.(next[0] ? { id: next[0].id, desc: next[0].desc } : null);
    },
    getCoreRowModel: getCoreRowModel(),
  });

  useEffect(() => {
    if (scrollKey === undefined) return;
    const el = topRef.current;
    if (el && el.getBoundingClientRect().top < 0) {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      el.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' });
    }
  }, [scrollKey]);

  const selectedRows = table.getSelectedRowModel().rows.map((r) => r.original);
  const clearSelection = () => setRowSelection({});
  const hideable = table.getAllLeafColumns().filter((c) => c.getCanHide() && !c.columnDef.meta?.alwaysVisible);
  const visibleCols = table.getVisibleLeafColumns();
  const showEmpty = !loading && data.length === 0;

  return (
    <div ref={topRef} className="scroll-mt-24 overflow-clip rounded-2xl border border-line bg-white shadow-soft">
      {/* Toolbar / bulk bar */}
      <div className="relative border-b border-line">
        <div className={cn('flex flex-wrap items-start gap-2 p-4', selectedRows.length > 0 && 'invisible')}>
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">{toolbar}</div>
          <div className="flex shrink-0 items-center gap-2">
          {toolbarEnd}
          {hideable.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="md" className="h-10" aria-label="Choose columns">
                  <Columns3 className="h-4 w-4" />
                  <span className="hidden lg:inline">Columns</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                <DropdownMenuLabel>Show columns</DropdownMenuLabel>
                {hideable.map((c) => (
                  <DropdownMenuCheckboxItem
                    key={c.id}
                    checked={c.getIsVisible()}
                    onCheckedChange={(v) => c.toggleVisibility(!!v)}
                    onSelect={(e) => e.preventDefault()}
                  >
                    {c.columnDef.meta?.label ?? (typeof c.columnDef.header === 'string' ? c.columnDef.header : c.id)}
                  </DropdownMenuCheckboxItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem checked={false} onCheckedChange={() => setVisibility(defaultVisibility)}>
                  Reset to default
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          </div>
        </div>
        {selectedRows.length > 0 && (
          <div className="fb-slide-down absolute inset-0 flex items-center gap-3 bg-forest px-3 text-white sm:px-4" role="region" aria-label="Bulk actions">
            <button
              type="button"
              onClick={clearSelection}
              aria-label="Clear selection"
              className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-lg text-white/80 transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
            <p className="text-sm font-semibold">
              <span className="tabular">{selectedRows.length}</span> selected
            </p>
            <div className="ml-auto flex items-center gap-2 overflow-x-auto">{bulkActions?.(selectedRows, clearSelection)}</div>
          </div>
        )}
      </div>

      {/* Mobile cards */}
      {mobileCard && (
        <ul className="divide-y divide-line md:hidden" aria-label={caption}>
          {loading
            ? Array.from({ length: Math.min(skeletonRows, 6) }, (_, i) => (
                <li key={i} className="space-y-2.5 p-4">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                  <Skeleton className="h-3.5 w-2/3" />
                  <Skeleton className="h-3.5 w-1/3" />
                </li>
              ))
            : table.getRowModel().rows.map((row) => (
                <li
                  key={row.id}
                  className={cn('relative fb-fade-in', row.getIsSelected() && 'bg-mint/60')}
                  onClick={(e) => {
                    if (rowHref && !isInteractive(e.target as HTMLElement)) router.push(rowHref(row.original));
                  }}
                >
                  {selectable && (
                    <div className="absolute right-4 top-4 z-10">
                      <Checkbox aria-label="Select row" checked={row.getIsSelected()} onCheckedChange={(v) => row.toggleSelected(v === true)} />
                    </div>
                  )}
                  {mobileCard(row.original)}
                </li>
              ))}
        </ul>
      )}

      {/* Table */}
      <div className={cn('overflow-x-auto 2xl:overflow-x-visible', mobileCard && 'hidden md:block')}>
        <table className="w-full border-separate border-spacing-0 text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead className="sticky top-16 z-10">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => {
                  const meta = h.column.columnDef.meta;
                  const canSort = h.column.getCanSort() && !!onSortChange;
                  const dir = h.column.getIsSorted();
                  const align = meta?.align ?? 'left';
                  return (
                    <th
                      key={h.id}
                      scope="col"
                      aria-sort={dir === 'asc' ? 'ascending' : dir === 'desc' ? 'descending' : canSort ? 'none' : undefined}
                      className={cn(
                        'whitespace-nowrap border-b border-line bg-[#f6faf7]/95 px-4 py-3 text-[13px] font-semibold text-muted backdrop-blur',
                        align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left',
                        meta?.className
                      )}
                    >
                      {h.isPlaceholder ? null : canSort ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (!dir) onSortChange?.({ id: h.column.id, desc: !!meta?.sortDescFirst });
                            else onSortChange?.({ id: h.column.id, desc: dir === 'asc' });
                          }}
                          className={cn(
                            'group inline-flex cursor-pointer items-center gap-1.5 rounded-md transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                            dir && 'text-ink'
                          )}
                        >
                          {flexRender(h.column.columnDef.header, h.getContext())}
                          {dir === 'asc' ? (
                            <ArrowUp className="h-3.5 w-3.5 text-primary" />
                          ) : dir === 'desc' ? (
                            <ArrowDown className="h-3.5 w-3.5 text-primary" />
                          ) : (
                            <ChevronsUpDown className="h-3.5 w-3.5 opacity-40 transition-opacity group-hover:opacity-100" />
                          )}
                        </button>
                      ) : (
                        flexRender(h.column.columnDef.header, h.getContext())
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: skeletonRows }, (_, i) => (
                  <tr key={`s${i}`} aria-hidden>
                    {visibleCols.map((c) => (
                      <td key={c.id} className={cn('h-[60px] border-b border-[#edf4ef] px-4 py-3', c.columnDef.meta?.className)}>
                        <SkeletonCell kind={c.columnDef.meta?.skeleton} align={c.columnDef.meta?.align} />
                      </td>
                    ))}
                  </tr>
                ))
              : table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    data-selected={row.getIsSelected() || undefined}
                    onClick={(e) => {
                      if (!rowHref || isInteractive(e.target as HTMLElement)) return;
                      if (window.getSelection()?.toString()) return;
                      router.push(rowHref(row.original));
                    }}
                    className={cn(
                      'fb-fade-in group/row transition-colors duration-150 hover:bg-mint-25 data-[selected]:bg-mint/60',
                      rowHref && 'cursor-pointer',
                      rowClassName?.(row.original)
                    )}
                  >
                    {row.getVisibleCells().map((cell) => {
                      const meta = cell.column.columnDef.meta;
                      return (
                        <td
                          key={cell.id}
                          className={cn(
                            'h-[60px] border-b border-[#edf4ef] px-4 py-2.5 align-middle text-ink',
                            meta?.align === 'right' && 'text-right',
                            meta?.align === 'center' && 'text-center',
                            meta?.className
                          )}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      );
                    })}
                  </tr>
                ))}
          </tbody>
        </table>
        {showEmpty && <div className="border-b border-line">{empty}</div>}
      </div>
      {showEmpty && mobileCard && <div className="md:hidden">{empty}</div>}
      {loading && <p className="sr-only" role="status">Loading rows…</p>}
      {footer}
    </div>
  );
}
