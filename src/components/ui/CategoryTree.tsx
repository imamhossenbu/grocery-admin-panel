'use client';

import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronRight, Folder, Tag } from 'lucide-react';
import { cn } from '@/lib/cn';

// Shared building blocks for every category tree in the panel (the picker
// and the Categories page): an arrow that rotates, an animated collapse
// region, and a thumbnail. Hierarchy is shown with left padding only — no
// connector lines or box-drawing characters.

/** Left padding for a row at `depth` (1 = top level), 20px per level. */
export function treeIndent(depth: number, base = 8): number {
  return base + (depth - 1) * 20;
}

/** ▸ / ▾ arrow. Rotates 90° when expanded. Leaf rows render an equal-width spacer. */
export function TreeChevron({
  expanded,
  hasChildren,
  onToggle,
  label,
  disabled = false,
  tabIndex = -1,
  size = 'md',
}: {
  expanded: boolean;
  hasChildren: boolean;
  onToggle: () => void;
  label: string;
  disabled?: boolean;
  tabIndex?: number;
  size?: 'sm' | 'md';
}) {
  const box = size === 'sm' ? 'h-6 w-6' : 'h-7 w-7';
  if (!hasChildren) return <span aria-hidden className={cn('shrink-0', box)} />;
  return (
    <button
      type="button"
      tabIndex={tabIndex}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      aria-label={label}
      aria-expanded={expanded}
      className={cn(
        'grid shrink-0 cursor-pointer place-items-center rounded-lg text-muted transition-colors duration-150 hover:bg-mint hover:text-primary disabled:cursor-default disabled:hover:bg-transparent',
        box
      )}
    >
      <motion.span
        initial={false}
        animate={{ rotate: expanded ? 90 : 0 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        className="grid place-items-center"
      >
        <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
      </motion.span>
    </button>
  );
}

/** Category image, or a folder (parent) / tag (leaf) icon tile when there is none. */
export function CategoryThumb({
  src,
  isParent,
  size = 'md',
}: {
  src?: string;
  isParent: boolean;
  size?: 'sm' | 'md' | 'lg';
}) {
  const dims = { sm: 'h-6 w-6 rounded-md', md: 'h-8 w-8 rounded-lg', lg: 'h-10 w-10 rounded-xl' }[size];
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" loading="lazy" className={cn('shrink-0 border border-line bg-mint-50 object-cover', dims)} />;
  }
  const Icon = isParent ? Folder : Tag;
  return (
    <span
      aria-hidden
      className={cn(
        'grid shrink-0 place-items-center',
        isParent ? 'bg-mint text-primary' : 'bg-[#f1f5f2] text-subtle',
        dims
      )}
    >
      <Icon className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
    </span>
  );
}

/** Animated expand/collapse of a subtree (height + opacity). */
export function TreeCollapse({
  open,
  children,
  as = 'ul',
  role = 'group',
  className = '',
}: {
  open: boolean;
  children: React.ReactNode;
  as?: 'ul' | 'div';
  role?: string;
  className?: string;
}) {
  const Comp = as === 'ul' ? motion.ul : motion.div;
  return (
    <AnimatePresence initial={false}>
      {open && (
        <Comp
          role={role}
          key="children"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className={cn('overflow-hidden', className)}
        >
          {children}
        </Comp>
      )}
    </AnimatePresence>
  );
}

/** Highlights the first occurrence of `query` in `text`. */
export function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim().toLowerCase();
  const at = q ? text.toLowerCase().indexOf(q) : -1;
  if (at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <mark className="rounded bg-[#fdecb5] px-0.5 text-inherit">{text.slice(at, at + q.length)}</mark>
      {text.slice(at + q.length)}
    </>
  );
}
