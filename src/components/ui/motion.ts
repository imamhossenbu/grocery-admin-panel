import type { Transition, Variants } from 'motion/react';

// Shared Framer Motion presets (durations 120–300ms, ease-out). The app is
// wrapped in <MotionConfig reducedMotion="user">, so transforms are dropped
// for people who prefer reduced motion.

export const EASE_OUT: Transition['ease'] = [0.16, 1, 0.3, 1];

export const popVariants: Variants = {
  initial: { opacity: 0, scale: 0.96, y: -4 },
  animate: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.16, ease: EASE_OUT } },
  exit: { opacity: 0, scale: 0.97, y: -4, transition: { duration: 0.12, ease: 'easeIn' } },
};

export const overlayVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.2, ease: 'easeOut' } },
  exit: { opacity: 0, transition: { duration: 0.15, ease: 'easeIn' } },
};

export const dialogVariants: Variants = {
  initial: { opacity: 0, scale: 0.96, y: 12 },
  animate: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.24, ease: EASE_OUT } },
  exit: { opacity: 0, scale: 0.97, y: 8, transition: { duration: 0.15, ease: 'easeIn' } },
};

export const sheetVariants = (side: 'left' | 'right'): Variants => ({
  initial: { x: side === 'right' ? '100%' : '-100%' },
  animate: { x: 0, transition: { duration: 0.3, ease: EASE_OUT } },
  exit: { x: side === 'right' ? '100%' : '-100%', transition: { duration: 0.2, ease: 'easeIn' } },
});

export const staggerParent: Variants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.045 } },
};

export const riseChild: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.28, ease: EASE_OUT } },
};
