'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'motion/react';
import { ChevronsLeft, Leaf } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Tooltip } from '@/components/ui/Tooltip';
import { NAV, isActive } from './nav';
import { usePulse } from './PulseProvider';
import { toggleSidebar, useSidebarCollapsed } from './sidebar-state';

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex min-w-0 items-center gap-3 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-leaf/60">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#1f7a46] to-[#0c2317] shadow-[inset_0_1px_0_rgba(255,255,255,.12)] ring-1 ring-white/10">
        <Leaf className="h-5 w-5 text-leaf" />
      </span>
      <span className={cn('min-w-0 transition-opacity duration-200', compact && 'sidebar-collapsed:pointer-events-none sidebar-collapsed:opacity-0')}>
        <span className="block whitespace-nowrap font-display text-lg font-semibold leading-tight tracking-tight text-white">
          Fresh<span className="text-leaf">Basket</span>
        </span>
        <span className="block whitespace-nowrap text-xs font-medium text-[#cfe3d6]">Admin console</span>
      </span>
    </Link>
  );
}

/**
 * Navigation list, shared by the desktop sidebar and the mobile drawer. The
 * current path is URL data, so it is read inside Suspense: the prerendered
 * shell shows the list without the active highlight for an instant.
 */
export function NavList(props: { onNavigate?: () => void; collapsible?: boolean }) {
  return (
    <Suspense fallback={<NavListInner {...props} pathname={null} />}>
      <NavListWithPath {...props} />
    </Suspense>
  );
}

function NavListWithPath(props: { onNavigate?: () => void; collapsible?: boolean }) {
  return <NavListInner {...props} pathname={usePathname()} />;
}

function NavListInner({ onNavigate, collapsible = true, pathname }: { onNavigate?: () => void; collapsible?: boolean; pathname: string | null }) {
  const { pulse } = usePulse();
  const collapsedState = useSidebarCollapsed();
  const collapsed = collapsible && collapsedState;

  return (
    <nav aria-label="Main" className="space-y-4">
      {NAV.map((group, gi) => (
        <div key={gi} className="space-y-1">
          {group.label && (
            <p
              className={cn(
                'px-3 pb-1 text-xs font-semibold text-[#a9c7b5] transition-opacity duration-200',
                collapsible && 'sidebar-collapsed:opacity-0'
              )}
            >
              {group.label}
            </p>
          )}
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = pathname !== null && isActive(pathname, item.href);
              const badge = pulse && item.badge ? item.badge(pulse) : null;
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Tooltip content={item.label} side="right" disabled={!collapsed} shortcut={badge ? `${badge.count}` : undefined}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? 'page' : undefined}
                      aria-label={collapsed ? (badge ? `${item.label}, ${badge.label}` : item.label) : undefined}
                      className={cn(
                        'group relative flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium outline-none transition-colors duration-150',
                        'focus-visible:ring-2 focus-visible:ring-leaf/60',
                        active ? 'text-white' : 'text-[#cfe3d6] hover:bg-white/[0.06] hover:text-white'
                      )}
                    >
                      {active && (
                        <motion.span
                          layoutId={collapsible ? 'nav-active' : 'nav-active-mobile'}
                          transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                          className="absolute inset-0 rounded-xl bg-white/[0.11] shadow-[inset_0_1px_0_rgba(255,255,255,.06)]"
                        >
                          <span className="absolute inset-y-2.5 left-0 w-[3px] rounded-r-full bg-leaf" />
                        </motion.span>
                      )}
                      <Icon className={cn('relative h-[19px] w-[19px] shrink-0 transition-colors', active ? 'text-leaf' : 'text-[#a9c7b5] group-hover:text-white')} />
                      <span
                        className={cn(
                          'relative flex-1 truncate transition-opacity duration-200',
                          collapsible && 'sidebar-collapsed:opacity-0'
                        )}
                      >
                        {item.label}
                      </span>
                      {badge && (
                        <span
                          className={cn(
                            'tabular relative grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-xs font-bold transition-all duration-200',
                            badge.tone === 'highlight' && 'bg-highlight text-[#3a2502]',
                            badge.tone === 'danger' && 'bg-[#e0577a] text-white',
                            badge.tone === 'gray' && 'bg-white/15 text-white',
                            collapsible &&
                              'sidebar-collapsed:absolute sidebar-collapsed:-right-0.5 sidebar-collapsed:top-1 sidebar-collapsed:h-[18px] sidebar-collapsed:min-w-[18px] sidebar-collapsed:px-1 sidebar-collapsed:leading-none'
                          )}
                          aria-hidden={collapsed || undefined}
                        >
                          {badge.count > 99 ? '99+' : badge.count}
                          {!collapsed && <span className="sr-only"> ({badge.label})</span>}
                        </span>
                      )}
                    </Link>
                  </Tooltip>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function Sidebar() {
  const collapsed = useSidebarCollapsed();
  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-40 hidden w-[var(--sidebar-w)] flex-col overflow-hidden bg-forest lg:flex print:hidden',
        'transition-[width] duration-300 ease-[cubic-bezier(.16,1,.3,1)] motion-reduce:transition-none sidebar-collapsed:w-[var(--sidebar-w-collapsed)]'
      )}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_60%_at_0%_0%,rgba(62,212,129,.10),transparent_60%)]" />
      <div className="relative flex h-16 shrink-0 items-center px-[18px]">
        <Brand compact />
      </div>
      <div className="scrollbar-dark scrollbar-hover relative flex-1 overflow-y-auto overflow-x-hidden px-3 py-4">
        <NavList />
      </div>
      <div className="relative border-t border-white/10 p-3">
        <Tooltip content={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} side="right" shortcut="[">
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!collapsed}
            className="flex h-10 w-full cursor-pointer items-center gap-3 rounded-xl px-3 text-sm font-medium text-[#cfe3d6] outline-none transition hover:bg-white/[0.06] hover:text-white focus-visible:ring-2 focus-visible:ring-leaf/60"
          >
            <ChevronsLeft className="h-[18px] w-[18px] shrink-0 transition-transform duration-300 sidebar-collapsed:rotate-180" />
            <span className="whitespace-nowrap transition-opacity duration-200 sidebar-collapsed:opacity-0">Collapse</span>
          </button>
        </Tooltip>
      </div>
    </aside>
  );
}
