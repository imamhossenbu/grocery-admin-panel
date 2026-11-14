'use client';

import React, { Suspense, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

/** Calls onChange when the path changes (inside Suspense: URL data). */
function PathWatcher({ onChange }: { onChange: () => void }) {
  const pathname = usePathname();
  const first = useRef(true);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });
  // After commit, not during render: onChange updates the parent's state.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    onChangeRef.current();
  }, [pathname]);
  return null;
}
import { MotionConfig } from 'motion/react';
import { X } from 'lucide-react';
import type { Pulse } from '@/types/admin';
import { TooltipProvider } from '@/components/ui/Tooltip';
import { ConfirmProvider } from '@/components/ui/ConfirmDialog';
import { ToastProvider } from '@/components/ui/Toast';
import { Drawer } from '@/components/ui/Modal';
import { Brand, NavList, Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { PulseProvider } from './PulseProvider';
import { CommandPalette } from './CommandPalette';
import { ShortcutsDialog } from './ShortcutsDialog';
import { NAV_ITEMS } from './nav';
import { toggleSidebar } from './sidebar-state';

function isTyping(el: EventTarget | null) {
  const t = el as HTMLElement | null;
  return !!t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || !!t.closest('[role="dialog"],[role="listbox"],[role="menu"]'));
}

/** App-wide providers (tooltips, confirm, toasts, motion). Also used by the UI kit page. */
export function AdminProviders({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <TooltipProvider>
        <ToastProvider>
          <ConfirmProvider>{children}</ConfirmProvider>
        </ToastProvider>
      </TooltipProvider>
    </MotionConfig>
  );
}

/**
 * The admin chrome: collapsible sidebar (desktop), off-canvas drawer
 * (mobile), top bar with breadcrumbs, ⌘K palette, bell and profile menu,
 * plus global keyboard shortcuts.
 */
export function AppShell({
  children,
  account,
  storefrontUrl,
  preview = false,
  initialPulse = null,
}: {
  children: React.ReactNode;
  account: React.ReactNode;
  storefrontUrl?: string;
  preview?: boolean;
  initialPulse?: Pulse | null;
}) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const gPressed = useRef(0);


  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((o) => !o);
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
      if (e.key === '/') {
        const search = document.querySelector<HTMLInputElement>('[data-page-search] input, input[data-page-search]');
        if (search) {
          e.preventDefault();
          search.focus();
          search.select();
        }
      } else if (e.key === '?') {
        setShortcutsOpen(true);
      } else if (e.key === '[') {
        toggleSidebar();
      } else if (e.key.toLowerCase() === 'g') {
        gPressed.current = Date.now();
      } else if (Date.now() - gPressed.current < 1200) {
        const item = NAV_ITEMS.find((i) => i.key === e.key.toLowerCase());
        gPressed.current = 0;
        if (item) router.push(item.href);
      }
    };
    const onShortcuts = () => setShortcutsOpen(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener('fb:shortcuts', onShortcuts);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('fb:shortcuts', onShortcuts);
    };
  }, [router]);

  return (
    <AdminProviders>
      <PulseProvider preview={preview} initial={initialPulse}>
        <a
          href="#main"
          className="fixed left-3 top-3 z-[100] -translate-y-20 rounded-xl bg-forest px-4 py-2 text-sm font-semibold text-white transition focus:translate-y-0"
        >
          Skip to content
        </a>
        <Suspense fallback={null}>
          <PathWatcher onChange={() => setMobileOpen(false)} />
        </Suspense>
        <Sidebar />
        <Drawer isOpen={mobileOpen} onClose={() => setMobileOpen(false)} side="left" width="max-w-[300px]" bare title="Navigation" className="bg-forest">
          <div className="flex h-16 items-center justify-between px-4">
            <Brand />
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Close navigation"
              className="grid h-10 w-10 cursor-pointer place-items-center rounded-xl text-[#cfe3d6] hover:bg-white/10"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="scrollbar-dark flex-1 overflow-y-auto px-3 py-4">
            <NavList collapsible={false} onNavigate={() => setMobileOpen(false)} />
          </div>
        </Drawer>

        <div className="min-h-dvh transition-[padding] duration-300 ease-[cubic-bezier(.16,1,.3,1)] motion-reduce:transition-none lg:pl-[var(--sidebar-w)] lg:sidebar-collapsed:pl-[var(--sidebar-w-collapsed)] print:!pl-0">
          <Topbar
            onOpenMenu={() => setMobileOpen(true)}
            onOpenPalette={() => setPaletteOpen(true)}
            account={account}
            storefrontUrl={storefrontUrl}
          />
          <main id="main" tabIndex={-1} className="mx-auto w-full max-w-[1440px] px-4 pb-16 pt-6 outline-none sm:px-6 lg:px-8 lg:pt-8 print:p-0">
            {children}
          </main>
        </div>

        <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} onShowShortcuts={() => setShortcutsOpen(true)} />
        <ShortcutsDialog open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      </PulseProvider>
    </AdminProviders>
  );
}
