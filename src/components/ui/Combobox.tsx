'use client';

import React, { useId, useState } from 'react';
import * as RP from '@radix-ui/react-popover';
import { Popover, PopoverContent } from './Popover';
import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Input } from './Input';

/**
 * Free-text input with suggestions (e.g. delivery areas). Typing filters the
 * list; ↑/↓ + Enter pick a suggestion; any typed value is allowed when
 * `allowCustom` is set.
 */
export function Combobox({
  value,
  onChange,
  options,
  placeholder,
  allowCustom = true,
  id,
  inputSize = 'md',
  leading,
  'aria-label': ariaLabel,
  className = '',
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  allowCustom?: boolean;
  id?: string;
  inputSize?: 'sm' | 'md' | 'lg';
  leading?: React.ReactNode;
  'aria-label'?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(value);
  const [synced, setSynced] = useState(value);
  const [active, setActive] = useState(0);
  const listId = useId();
  if (value !== synced) {
    setSynced(value);
    setText(value);
  }
  const q = text.trim().toLowerCase();
  const matches = options.filter((o) => !q || o.toLowerCase().includes(q)).slice(0, 50);

  const pick = (v: string) => {
    onChange(v);
    setText(v);
    setOpen(false);
  };

  return (
    <Popover open={open && matches.length > 0} onOpenChange={setOpen}>
      <RP.Anchor asChild>
        <div className={className}>
          <Input
            id={id}
            inputSize={inputSize}
            leading={leading}
            value={text}
            placeholder={placeholder}
            role="combobox"
            aria-label={ariaLabel}
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={open && matches[active] ? `${listId}-${active}` : undefined}
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              setText(e.target.value);
              setActive(0);
              setOpen(true);
              if (allowCustom) onChange(e.target.value);
            }}
            onBlur={() => {
              if (!allowCustom && !options.includes(text)) setText(value);
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setOpen(true);
                setActive((a) => Math.min(a + 1, matches.length - 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === 'Enter' && open && matches[active]) {
                e.preventDefault();
                pick(matches[active]);
              } else if (e.key === 'Escape') setOpen(false);
            }}
          />
        </div>
      </RP.Anchor>
        <PopoverContent
          unstyled
          align="start"
          sideOffset={6}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onInteractOutside={(e) => {
            if ((e.target as HTMLElement).closest?.(`[aria-controls="${listId}"]`)) e.preventDefault();
          }}
          className="max-h-72 w-[var(--radix-popover-trigger-width)] min-w-56 overflow-y-auto rounded-xl border border-line bg-white p-1.5 shadow-pop"
        >
          <ul id={listId} role="listbox">
            {matches.map((o, i) => (
              <li
                key={o}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={o === value}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(o)}
                onPointerMove={() => setActive(i)}
                className={cn(
                  'flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 text-sm',
                  i === active ? 'bg-mint text-primary-600' : 'text-ink'
                )}
              >
                {o}
                {o === value && <Check className="h-4 w-4 text-primary" />}
              </li>
            ))}
          </ul>
        </PopoverContent>
    </Popover>
  );
}
