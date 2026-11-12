'use client';

import React, { createContext, useContext, useState } from 'react';
import * as DM from '@radix-ui/react-dropdown-menu';
import { AnimatePresence, motion } from 'motion/react';
import { popVariants } from './motion';
import { Check, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';

const OpenContext = createContext(false);

/** Radix DropdownMenu that tracks `open` so the content can animate out (Framer Motion). */
export function DropdownMenu({
  open: openProp,
  onOpenChange,
  children,
  modal,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
  modal?: boolean;
}) {
  const [inner, setInner] = useState(false);
  const open = openProp ?? inner;
  return (
    <OpenContext value={open}>
      <DM.Root
        open={open}
        modal={modal}
        onOpenChange={(o) => {
          if (openProp === undefined) setInner(o);
          onOpenChange?.(o);
        }}
      >
        {children}
      </DM.Root>
    </OpenContext>
  );
}
export const DropdownMenuTrigger = DM.Trigger;
export const DropdownMenuGroup = DM.Group;
export const DropdownMenuSub = DM.Sub;
export const DropdownMenuRadioGroup = DM.RadioGroup;

const itemBase =
  'relative flex min-h-9 cursor-pointer select-none items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-ink outline-none transition-colors ' +
  'data-[highlighted]:bg-mint data-[highlighted]:text-primary-600 data-[disabled]:pointer-events-none data-[disabled]:opacity-45 [&_svg]:h-4 [&_svg]:w-4 [&_svg]:shrink-0';

export function DropdownMenuContent({
  className = '',
  sideOffset = 6,
  align = 'end',
  children,
  ...props
}: Omit<React.ComponentProps<typeof DM.Content>, 'asChild' | 'forceMount'>) {
  const open = useContext(OpenContext);
  return (
    <AnimatePresence>
      {open && (
        <DM.Portal forceMount>
          <DM.Content forceMount asChild sideOffset={sideOffset} align={align} collisionPadding={12} {...props}>
            <motion.div
              variants={popVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              style={{ transformOrigin: 'var(--radix-dropdown-menu-content-transform-origin)' }}
              className={cn(
                'z-[70] min-w-48 max-h-[var(--radix-dropdown-menu-content-available-height)] overflow-y-auto rounded-xl border border-line bg-white p-1.5 shadow-pop outline-none',
                className
              )}
            >
              {children}
            </motion.div>
          </DM.Content>
        </DM.Portal>
      )}
    </AnimatePresence>
  );
}

export function DropdownMenuItem({
  className = '',
  tone = 'default',
  shortcut,
  ...props
}: React.ComponentProps<typeof DM.Item> & { tone?: 'default' | 'danger'; shortcut?: React.ReactNode }) {
  return (
    <DM.Item
      className={cn(
        itemBase,
        tone === 'danger' && 'text-red-700 data-[highlighted]:bg-red-50 data-[highlighted]:text-red-700',
        className
      )}
      {...props}
    >
      {props.children}
      {shortcut && <span className="ml-auto pl-4 text-xs font-semibold text-subtle">{shortcut}</span>}
    </DM.Item>
  );
}

export function DropdownMenuCheckboxItem({ className = '', children, ...props }: React.ComponentProps<typeof DM.CheckboxItem>) {
  return (
    <DM.CheckboxItem className={cn(itemBase, 'pl-8', className)} {...props}>
      <span className="absolute left-2 grid h-4 w-4 place-items-center rounded-[5px] border border-line-strong bg-white data-[state=checked]:border-primary data-[state=checked]:bg-primary">
        <DM.ItemIndicator>
          <Check className="!h-3 !w-3 text-white" strokeWidth={3} />
        </DM.ItemIndicator>
      </span>
      {children}
    </DM.CheckboxItem>
  );
}

export function DropdownMenuRadioItem({ className = '', children, ...props }: React.ComponentProps<typeof DM.RadioItem>) {
  return (
    <DM.RadioItem className={cn(itemBase, 'pl-8', className)} {...props}>
      <span className="absolute left-2.5 grid h-3.5 w-3.5 place-items-center rounded-full border border-line-strong">
        <DM.ItemIndicator>
          <span className="block h-2 w-2 rounded-full bg-primary" />
        </DM.ItemIndicator>
      </span>
      {children}
    </DM.RadioItem>
  );
}

export function DropdownMenuLabel({ className = '', ...props }: React.ComponentProps<typeof DM.Label>) {
  return <DM.Label className={cn('px-2.5 pb-1 pt-2 text-xs font-semibold text-muted', className)} {...props} />;
}

export function DropdownMenuSeparator({ className = '' }: { className?: string }) {
  return <DM.Separator className={cn('my-1.5 h-px bg-line', className)} />;
}

export function DropdownMenuSubTrigger({ className = '', children, ...props }: React.ComponentProps<typeof DM.SubTrigger>) {
  return (
    <DM.SubTrigger className={cn(itemBase, 'data-[state=open]:bg-mint', className)} {...props}>
      {children}
      <ChevronRight className="ml-auto text-subtle" />
    </DM.SubTrigger>
  );
}

export function DropdownMenuSubContent({ className = '', ...props }: React.ComponentProps<typeof DM.SubContent>) {
  return (
    <DM.Portal>
      <DM.SubContent
        sideOffset={6}
        collisionPadding={12}
        className={cn('fb-pop z-[71] min-w-44 rounded-xl border border-line bg-white p-1.5 shadow-pop', className)}
        {...props}
      />
    </DM.Portal>
  );
}
