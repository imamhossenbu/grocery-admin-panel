'use client';

import React from 'react';
import * as RD from '@radix-ui/react-dialog';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { dialogVariants, overlayVariants, sheetVariants } from './motion';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** false = outside click / Esc do not close (e.g. while saving). */
  dismissable?: boolean;
  icon?: React.ReactNode;
}

const closeBtn =
  'grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-full text-muted transition hover:bg-mint hover:text-ink active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40';

/**
 * Centered dialog on Radix Dialog (focus trap, Esc, scroll lock, focus
 * return) with Framer Motion scale+fade enter/exit.
 */
export function Modal({ isOpen, onClose, title, subtitle, size = 'lg', children, footer, dismissable = true, icon }: ModalProps) {
  const sizeClass = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }[size];
  return (
    <RD.Root open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <AnimatePresence>
        {isOpen && (
          <RD.Portal forceMount>
            <RD.Overlay forceMount asChild>
              <motion.div
                variants={overlayVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-[#071a10]/55 p-4 backdrop-blur-[3px]"
              >
                <RD.Content
                  forceMount
                  asChild
                  onPointerDownOutside={(e) => !dismissable && e.preventDefault()}
                  onEscapeKeyDown={(e) => !dismissable && e.preventDefault()}
                >
                  <motion.div
                    variants={dialogVariants}
                    className={cn('relative my-8 flex w-full flex-col overflow-hidden rounded-3xl border border-line bg-white shadow-pop outline-none', sizeClass)}
                  >
                    {title ? (
                      <div className="flex items-start justify-between gap-4 border-b border-[#e6f0e9] px-6 py-4">
                        <div className="flex min-w-0 items-start gap-3">
                          {icon && <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-mint text-primary">{icon}</span>}
                          <div className="min-w-0">
                            <RD.Title className="font-display text-xl font-semibold text-ink">{title}</RD.Title>
                            <RD.Description className={subtitle ? 'mt-0.5 text-[13px] text-muted' : 'sr-only'}>
                              {subtitle ?? (typeof title === 'string' ? title : 'Dialog')}
                            </RD.Description>
                          </div>
                        </div>
                        <RD.Close className={closeBtn} aria-label="Close">
                          <X className="h-5 w-5" />
                        </RD.Close>
                      </div>
                    ) : (
                      <>
                        <RD.Title className="sr-only">Dialog</RD.Title>
                        <RD.Description className="sr-only">Dialog</RD.Description>
                      </>
                    )}
                    <div className="px-6 py-5">{children}</div>
                    {footer && (
                      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[#e6f0e9] bg-mint-25 px-6 py-3.5">{footer}</div>
                    )}
                  </motion.div>
                </RD.Content>
              </motion.div>
            </RD.Overlay>
          </RD.Portal>
        )}
      </AnimatePresence>
    </RD.Root>
  );
}

/**
 * Side sheet (right) or off-canvas drawer (left). Same a11y guarantees as
 * Modal; slides in/out with Framer Motion.
 */
export function Drawer({
  isOpen,
  onClose,
  title,
  subtitle,
  side = 'right',
  width = 'max-w-lg',
  children,
  footer,
  bare = false,
  className = '',
  dismissable = true,
}: {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  side?: 'left' | 'right';
  width?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** No header/padding: the caller renders everything (e.g. the mobile nav). */
  bare?: boolean;
  className?: string;
  dismissable?: boolean;
}) {
  return (
    <RD.Root open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <AnimatePresence>
        {isOpen && (
          <RD.Portal forceMount>
            <RD.Overlay forceMount asChild>
              <motion.div
                variants={overlayVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="fixed inset-0 z-[60] bg-[#071a10]/50 backdrop-blur-[2px]"
              />
            </RD.Overlay>
            <RD.Content
              forceMount
              asChild
              onPointerDownOutside={(e) => !dismissable && e.preventDefault()}
              onEscapeKeyDown={(e) => !dismissable && e.preventDefault()}
            >
              <motion.div
                variants={sheetVariants(side)}
                initial="initial"
                animate="animate"
                exit="exit"
                className={cn(
                  'fixed inset-y-0 z-[61] flex w-full flex-col bg-white shadow-pop outline-none',
                  side === 'right' ? 'right-0 sm:rounded-l-3xl' : 'left-0',
                  width,
                  className
                )}
              >
                {bare ? (
                  <>
                    <RD.Title className="sr-only">{title ?? 'Panel'}</RD.Title>
                    <RD.Description className="sr-only">{subtitle ?? 'Panel'}</RD.Description>
                    {children}
                  </>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-4 border-b border-[#e6f0e9] px-6 py-5">
                      <div className="min-w-0">
                        <RD.Title className="font-display text-xl font-semibold text-ink">{title}</RD.Title>
                        <RD.Description className={subtitle ? 'mt-0.5 text-[13px] text-muted' : 'sr-only'}>{subtitle ?? 'Panel'}</RD.Description>
                      </div>
                      <RD.Close className={closeBtn} aria-label="Close">
                        <X className="h-5 w-5" />
                      </RD.Close>
                    </div>
                    <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
                    {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[#e6f0e9] bg-mint-25 px-6 py-4">{footer}</div>}
                  </>
                )}
              </motion.div>
            </RD.Content>
          </RD.Portal>
        )}
      </AnimatePresence>
    </RD.Root>
  );
}
