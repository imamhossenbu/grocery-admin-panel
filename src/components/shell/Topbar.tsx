'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, ExternalLink, Menu, Search } from 'lucide-react';
import { Kbd } from '@/components/ui/Card';
import { Tooltip } from '@/components/ui/Tooltip';
import { crumbsFor } from './nav';
import { NotificationBell } from './NotificationBell';

export function Breadcrumbs() {
  return (
    <Suspense fallback={<span aria-hidden className="block h-5 w-40 skeleton rounded-md" />}>
      <BreadcrumbsInner />
    </Suspense>
  );
}

function BreadcrumbsInner() {
  const pathname = usePathname();
  const crumbs = crumbsFor(pathname);
  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex min-w-0 items-center gap-1.5 text-sm">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <li key={i} className={`flex min-w-0 items-center gap-1.5 ${!last ? 'hidden sm:flex' : ''}`}>
              {i > 0 && <ChevronRight aria-hidden className="hidden h-4 w-4 shrink-0 text-[#9db3a6] sm:block" />}
              {c.href && !last ? (
                <Link href={c.href} className="truncate font-medium text-muted transition hover:text-ink">
                  {c.label}
                </Link>
              ) : (
                <span aria-current={last ? 'page' : undefined} className={`truncate ${last ? 'font-semibold text-ink' : 'font-medium text-muted'}`}>
                  {c.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function Topbar({
  onOpenMenu,
  onOpenPalette,
  account,
  storefrontUrl,
}: {
  onOpenMenu: () => void;
  onOpenPalette: () => void;
  account: React.ReactNode;
  storefrontUrl?: string;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/85 backdrop-blur-xl print:hidden">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="Open navigation"
          className="-ml-1 grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-xl text-ink transition hover:bg-mint active:scale-95 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="min-w-0 flex-1">
          <Breadcrumbs />
        </div>

        <button
          type="button"
          onClick={onOpenPalette}
          className="group hidden h-10 w-72 cursor-pointer items-center gap-2.5 rounded-xl border border-line-strong bg-mint-25 px-3 text-left text-sm text-[#5f7769] transition hover:border-[#b5d2bf] hover:bg-white md:flex"
        >
          <Search className="h-4 w-4 text-muted" />
          <span className="flex-1 truncate">Search orders, products…</span>
          <span className="flex gap-1">
            <Kbd>⌘</Kbd>
            <Kbd>K</Kbd>
          </span>
        </button>
        <Tooltip content="Search" shortcut="⌘K">
          <button
            type="button"
            onClick={onOpenPalette}
            aria-label="Search"
            className="grid h-10 w-10 cursor-pointer place-items-center rounded-xl text-muted transition hover:bg-mint hover:text-ink md:hidden"
          >
            <Search className="h-5 w-5" />
          </button>
        </Tooltip>

        {storefrontUrl && (
          <Tooltip content="Open the customer storefront in a new tab">
            <a
              href={storefrontUrl}
              target="_blank"
              rel="noreferrer"
              className="hidden h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium text-primary-600 transition hover:bg-mint sm:inline-flex"
            >
              View storefront
              <ExternalLink className="h-4 w-4" />
            </a>
          </Tooltip>
        )}

        <NotificationBell />
        <span aria-hidden className="hidden h-6 w-px bg-line sm:block" />
        {account}
      </div>
    </header>
  );
}
