'use client';

import { useEffect, useRef } from 'react';
import { animate, useReducedMotion } from 'motion/react';

/**
 * Counts from the previous value (0 on first mount) to `value` with Framer
 * Motion's `animate()`. Writes straight to the DOM (no re-render per frame).
 * Shows the final value at once for reduced motion. Screen readers always
 * get the final value.
 */
export function CountUp({ value, format = (n) => String(Math.round(n)), duration = 0.7 }: { value: number; format?: (n: number) => string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const from = useRef(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const start = from.current;
    from.current = value;
    if (reduce || start === value) {
      el.textContent = format(value);
      return;
    }
    const controls = animate(start, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        el.textContent = format(v);
      },
    });
    return () => controls.stop();
  }, [value, duration, reduce, format]);

  return (
    <>
      <span ref={ref} aria-hidden>
        {format(value)}
      </span>
      <span className="sr-only">{format(value)}</span>
    </>
  );
}
