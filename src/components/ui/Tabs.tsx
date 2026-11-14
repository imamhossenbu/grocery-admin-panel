'use client';

import React, { useId } from 'react';
import * as RT from '@radix-ui/react-tabs';
import { motion } from 'motion/react';
import { cn } from '@/lib/cn';

export const TabsRoot = RT.Root;
export const TabsContent = RT.Content;

export interface TabItem<T extends string> {
  value: T;
  label: React.ReactNode;
  count?: number;
  icon?: React.ReactNode;
  tone?: 'default' | 'danger';
}

/**
 * Tab list with a sliding active indicator (shared-layout animation; reduced
 * motion makes it jump). `variant="pill"` = segmented control, `"line"` =
 * underline tabs.
 */
export function TabsList<T extends string>({
  items,
  value,
  variant = 'line',
  className = '',
  'aria-label': ariaLabel,
}: {
  items: TabItem<T>[];
  value: T;
  variant?: 'line' | 'pill';
  className?: string;
  'aria-label'?: string;
}) {
  const layoutId = useId();
  return (
    <RT.List
      aria-label={ariaLabel}
      className={cn(
        'relative flex max-w-full items-center overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        variant === 'pill' ? 'gap-1 rounded-xl bg-[#eaf2ed] p-1' : 'gap-1 border-b border-line',
        className
      )}
    >
      {items.map((t) => {
        const active = t.value === value;
        return (
          <RT.Trigger
            key={t.value}
            value={t.value}
            className={cn(
              'group relative flex shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap text-[13px] font-semibold outline-none transition-colors duration-150',
              'focus-visible:ring-2 focus-visible:ring-primary/40 rounded-lg',
              variant === 'pill' ? 'h-8 px-3' : 'h-11 px-3',
              active ? (variant === 'pill' ? 'text-ink' : 'text-primary-600') : 'text-muted hover:text-ink'
            )}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                transition={{ type: 'spring', stiffness: 520, damping: 40, mass: 0.8 }}
                className={cn(
                  'absolute',
                  variant === 'pill'
                    ? 'inset-0 rounded-lg bg-white shadow-[0_1px_3px_rgba(15,44,29,.12)]'
                    : 'inset-x-2 bottom-0 h-[2.5px] rounded-full bg-primary'
                )}
              />
            )}
            <span className="relative flex items-center gap-2 [&_svg]:h-4 [&_svg]:w-4">
              {t.icon}
              {t.label}
              {t.count !== undefined && (
                <span
                  className={cn(
                    'tabular min-w-5 rounded-full px-1.5 py-px text-center text-[11px] font-extrabold transition-colors',
                    t.tone === 'danger' && t.count > 0
                      ? 'bg-red-600 text-white'
                      : active
                        ? 'bg-primary text-white'
                        : 'bg-[#e6eee9] text-muted group-hover:bg-[#dbe7df]'
                  )}
                >
                  {t.count.toLocaleString('en-IN')}
                </span>
              )}
            </span>
          </RT.Trigger>
        );
      })}
    </RT.List>
  );
}
