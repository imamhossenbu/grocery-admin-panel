'use client';

import React, { createContext, useContext, useState } from 'react';
import * as RP from '@radix-ui/react-popover';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '@/lib/cn';
import { popVariants } from './motion';

const OpenContext = createContext(false);

/**
 * Radix Popover with Framer Motion enter/exit. Works controlled
 * (`open` + `onOpenChange`) or uncontrolled.
 */
export function Popover({
  open: openProp,
  onOpenChange,
  defaultOpen = false,
  children,
  modal,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
  children: React.ReactNode;
  modal?: boolean;
}) {
  const [inner, setInner] = useState(defaultOpen);
  const open = openProp ?? inner;
  return (
    <OpenContext value={open}>
      <RP.Root
        open={open}
        modal={modal}
        onOpenChange={(o) => {
          if (openProp === undefined) setInner(o);
          onOpenChange?.(o);
        }}
      >
        {children}
      </RP.Root>
    </OpenContext>
  );
}

export const PopoverTrigger = RP.Trigger;
export const PopoverAnchor = RP.Anchor;
export const PopoverClose = RP.Close;

export function PopoverContent({
  className = '',
  children,
  align = 'start',
  sideOffset = 8,
  unstyled = false,
  ...props
}: Omit<React.ComponentProps<typeof RP.Content>, 'asChild' | 'forceMount'> & { unstyled?: boolean }) {
  const open = useContext(OpenContext);
  return (
    <AnimatePresence>
      {open && (
        <RP.Portal forceMount>
          <RP.Content forceMount asChild align={align} sideOffset={sideOffset} collisionPadding={12} {...props}>
            <motion.div
              variants={popVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              style={{ transformOrigin: 'var(--radix-popover-content-transform-origin)' }}
              className={cn('z-[75] outline-none', !unstyled && 'rounded-2xl border border-line bg-white p-3 shadow-pop', className)}
            >
              {children}
            </motion.div>
          </RP.Content>
        </RP.Portal>
      )}
    </AnimatePresence>
  );
}
