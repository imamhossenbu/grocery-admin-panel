import { twMerge } from 'tailwind-merge';

/**
 * Joins class names, skipping falsy values, and resolves Tailwind conflicts
 * so the later class wins: cn('w-full px-3', 'w-28') → 'px-3 w-28'.
 * Without the merge, a component's base `w-full` could beat a caller's
 * `w-28` depending on CSS order.
 */
export function cn(...parts: Array<string | false | null | undefined | 0>): string {
  return twMerge(parts.filter(Boolean).join(' '));
}
