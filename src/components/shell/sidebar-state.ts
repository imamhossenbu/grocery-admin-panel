'use client';

import { useSyncExternalStore } from 'react';

// The collapsed flag lives on <html data-sidebar> (set before paint by the
// root layout) and in localStorage. This hook mirrors it into React.

const KEY = 'fb-admin:sidebar';
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useSidebarCollapsed(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => document.documentElement.dataset.sidebar === 'collapsed',
    () => false
  );
}

export function setSidebarCollapsed(collapsed: boolean) {
  const el = document.documentElement;
  if (collapsed) el.dataset.sidebar = 'collapsed';
  else delete el.dataset.sidebar;
  try {
    localStorage.setItem(KEY, collapsed ? 'collapsed' : 'expanded');
  } catch {
    // ignore
  }
  listeners.forEach((l) => l());
}

export function toggleSidebar() {
  setSidebarCollapsed(document.documentElement.dataset.sidebar !== 'collapsed');
}
