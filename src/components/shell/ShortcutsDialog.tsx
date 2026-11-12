'use client';

import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Kbd } from '@/components/ui/Card';
import { NAV_ITEMS } from './nav';

const GENERAL: { keys: string[]; label: string }[] = [
  { keys: ['⌘', 'K'], label: 'Open command palette (Ctrl K on Windows)' },
  { keys: ['/'], label: 'Focus the search box on this page' },
  { keys: ['['], label: 'Collapse or expand the sidebar' },
  { keys: ['?'], label: 'Show this list' },
  { keys: ['Esc'], label: 'Close dialogs, menus and pickers' },
];

export function ShortcutsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal isOpen={open} onClose={onClose} title="Keyboard shortcuts" subtitle="Work faster without the mouse." size="md">
      <div className="grid gap-6 sm:grid-cols-2">
        <section>
          <h3 className="mb-2 text-[13px] font-semibold text-muted">General</h3>
          <ul className="space-y-2">
            {GENERAL.map((s) => (
              <li key={s.label} className="flex items-center justify-between gap-3 text-sm text-ink">
                <span>{s.label}</span>
                <span className="flex shrink-0 gap-1">
                  {s.keys.map((k) => (
                    <Kbd key={k}>{k}</Kbd>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h3 className="mb-2 text-[13px] font-semibold text-muted">Go to (press G, then…)</h3>
          <ul className="space-y-2">
            {NAV_ITEMS.map((i) => (
              <li key={i.href} className="flex items-center justify-between gap-3 text-sm text-ink">
                <span>{i.label}</span>
                <span className="flex gap-1">
                  <Kbd>G</Kbd>
                  <Kbd>{i.key.toUpperCase()}</Kbd>
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </Modal>
  );
}
