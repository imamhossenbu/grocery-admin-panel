'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { Toaster, toast as sonner } from 'sonner';
import { AlertTriangle, BellRing, CheckCircle2, Info, X } from 'lucide-react';
import { cn } from '@/lib/cn';

// Toasts are rendered by `sonner` (stacking, swipe, pause-on-hover,
// enter/exit motion) with a fully custom, brand-styled card.

type ToastKind = 'success' | 'error' | 'info' | 'order';

interface ToastExtra {
  action?: { label: string; href?: string; onClick?: () => void };
  duration?: number;
}

interface ToastApi {
  success: (title: string, description?: React.ReactNode, extra?: ToastExtra) => void;
  error: (title: string, description?: React.ReactNode, extra?: ToastExtra) => void;
  info: (title: string, description?: React.ReactNode, extra?: ToastExtra) => void;
  order: (title: string, description?: React.ReactNode, extra?: ToastExtra) => void;
  dismiss: (id?: string | number) => void;
}

const ICON = { success: CheckCircle2, error: AlertTriangle, info: Info, order: BellRing };
const ICON_COLOR = { success: 'text-leaf', error: 'text-[#ff8a8a]', info: 'text-sky-300', order: 'text-highlight' };

function show(kind: ToastKind, title: string, description?: React.ReactNode, extra: ToastExtra = {}) {
  const Icon = ICON[kind];
  sonner.custom(
    (id) => (
      <div
        role={kind === 'error' ? 'alert' : 'status'}
        className="relative flex w-[calc(100vw-24px)] items-start gap-3 rounded-2xl border border-white/10 bg-forest p-4 pr-11 text-white shadow-pop sm:w-[380px]"
      >
        <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', ICON_COLOR[kind], kind === 'order' && 'fb-wiggle')} aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-snug">{title}</p>
          {description && <div className="mt-0.5 text-[13px] leading-relaxed text-[#cfe3d6]">{description}</div>}
          {extra.action &&
            (extra.action.href ? (
              <Link
                href={extra.action.href}
                onClick={() => sonner.dismiss(id)}
                className="mt-2.5 inline-flex rounded-lg bg-white/10 px-3 py-1.5 text-[13px] font-semibold text-highlight transition hover:bg-white/15"
              >
                {extra.action.label}
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => {
                  extra.action?.onClick?.();
                  sonner.dismiss(id);
                }}
                className="mt-2.5 inline-flex cursor-pointer rounded-lg bg-white/10 px-3 py-1.5 text-[13px] font-semibold text-highlight transition hover:bg-white/15"
              >
                {extra.action.label}
              </button>
            ))}
        </div>
        <button
          type="button"
          onClick={() => sonner.dismiss(id)}
          aria-label="Dismiss notification"
          className="absolute right-2.5 top-2.5 grid h-8 w-8 cursor-pointer place-items-center rounded-full text-[#9fbfab] transition hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    ),
    { duration: extra.duration ?? (kind === 'error' ? 8000 : kind === 'order' ? 9000 : 4000) }
  );
}

const api: ToastApi = {
  success: (t, d, e) => show('success', t, d, e),
  error: (t, d, e) => show('error', t, d, e),
  info: (t, d, e) => show('info', t, d, e),
  order: (t, d, e) => show('order', t, d, e),
  dismiss: (id) => sonner.dismiss(id),
};

export function useToast(): ToastApi {
  return useMemo(() => api, []);
}

export const toast = api;

/** Mount once (in the app shell). */
export function ToastProvider({ children }: { children?: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster
        position="bottom-right"
        visibleToasts={4}
        gap={10}
        offset={20}
        mobileOffset={12}
        containerAriaLabel="Notifications"
        className="print:hidden"
        toastOptions={{ unstyled: true }}
      />
    </>
  );
}
