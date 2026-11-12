'use client';

import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import * as AD from '@radix-ui/react-alert-dialog';
import { AnimatePresence, motion } from 'motion/react';
import { dialogVariants, overlayVariants } from './motion';
import { AlertTriangle, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/cn';
import { buttonClass } from './Button';

export interface ConfirmOptions {
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'default';
  /** Extra content (e.g. a list of affected items). */
  details?: React.ReactNode;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/**
 * Promise-based confirmation, replacing window.confirm():
 *   const confirm = useConfirm();
 *   if (!(await confirm({ title: 'Delete?', tone: 'danger' }))) return;
 */
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used inside <ConfirmProvider>');
  return ctx;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<(ConfirmOptions & { open: boolean }) | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((options) => {
    resolver.current?.(false);
    setState({ ...options, open: true });
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const settle = (value: boolean) => {
    resolver.current?.(value);
    resolver.current = null;
    setState((s) => (s ? { ...s, open: false } : s));
  };

  const danger = state?.tone === 'danger';

  return (
    <ConfirmContext value={confirm}>
      {children}
      <AD.Root open={!!state?.open} onOpenChange={(o) => !o && settle(false)}>
        <AnimatePresence>
          {state?.open && (
            <AD.Portal forceMount>
              <AD.Overlay forceMount asChild>
                <motion.div
                  variants={overlayVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="fixed inset-0 z-[90] grid place-items-center bg-[#071a10]/55 p-4 backdrop-blur-[3px]"
                >
                  <AD.Content forceMount asChild>
                    <motion.div variants={dialogVariants} className="w-full max-w-md overflow-hidden rounded-3xl border border-line bg-white shadow-pop outline-none">
                      <div className="flex gap-4 px-6 pb-4 pt-6">
                        <span
                          className={cn(
                            'grid h-11 w-11 shrink-0 place-items-center rounded-2xl',
                            danger ? 'bg-red-50 text-red-600' : 'bg-mint text-primary'
                          )}
                        >
                          {danger ? <AlertTriangle className="h-5 w-5" /> : <HelpCircle className="h-5 w-5" />}
                        </span>
                        <div className="min-w-0 pt-0.5">
                          <AD.Title className="font-display text-lg font-semibold text-ink">{state.title}</AD.Title>
                          <AD.Description asChild>
                            <div className="mt-1 text-sm leading-relaxed text-muted">{state.description ?? ''}</div>
                          </AD.Description>
                          {state.details && <div className="mt-3">{state.details}</div>}
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 border-t border-[#e6f0e9] bg-mint-25 px-6 py-3.5">
                        <AD.Cancel className={buttonClass('outline', 'sm')}>{state.cancelLabel ?? 'Cancel'}</AD.Cancel>
                        <AD.Action className={buttonClass(danger ? 'danger' : 'primary', 'sm')} onClick={() => settle(true)}>
                          {state.confirmLabel ?? 'Confirm'}
                        </AD.Action>
                      </div>
                    </motion.div>
                  </AD.Content>
                </motion.div>
              </AD.Overlay>
            </AD.Portal>
          )}
        </AnimatePresence>
      </AD.Root>
    </ConfirmContext>
  );
}
