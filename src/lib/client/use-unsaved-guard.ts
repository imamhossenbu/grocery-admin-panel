'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useConfirm } from '@/components/ui/ConfirmDialog';

/**
 * Protects unsaved form changes:
 *  - closing/reloading the tab shows the browser's leave prompt;
 *  - clicking any in-app link asks with the brand confirm dialog first.
 * Call allowNextNavigation() right before a programmatic redirect after save.
 */
export function useUnsavedChangesGuard(dirty: boolean) {
  const router = useRouter();
  const confirm = useConfirm();
  const bypass = useRef(false);
  const dirtyRef = useRef(dirty);
  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirtyRef.current || bypass.current) return;
      e.preventDefault();
    };
    const onClick = async (e: MouseEvent) => {
      if (!dirtyRef.current || bypass.current) return;
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement | null)?.closest('a[href]') as HTMLAnchorElement | null;
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      e.preventDefault();
      e.stopPropagation();
      const ok = await confirm({
        title: 'Leave without saving?',
        description: 'You have unsaved changes on this page. They will be lost.',
        confirmLabel: 'Discard changes',
        cancelLabel: 'Keep editing',
        tone: 'danger',
      });
      if (ok) {
        bypass.current = true;
        router.push(`${url.pathname}${url.search}${url.hash}`);
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('click', onClick, true);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('click', onClick, true);
    };
  }, [confirm, router]);

  const allowNextNavigation = useCallback(() => {
    bypass.current = true;
  }, []);

  return { allowNextNavigation };
}
