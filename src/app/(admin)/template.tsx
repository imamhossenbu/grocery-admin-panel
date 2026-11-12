'use client';

import { motion } from 'motion/react';

/** Re-mounts on every navigation: a short fade/slide for the page content. */
export default function AdminTemplate({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}>
      {children}
    </motion.div>
  );
}
