import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Traps Tab/Shift+Tab focus cycling within `containerRef` while `active`,
 * moves focus into the container on activation, and restores focus to
 * whatever had it beforehand once the dialog closes. Every modal in this
 * app (ConfirmDialog, ActivityModal, AIChangeReview, the move-to-day
 * picker) previously handled Escape-to-close individually but none trapped
 * focus or restored it — a keyboard or screen-reader user could Tab straight
 * through a "modal" into the page behind it, and closing a dialog silently
 * dropped focus back to <body> instead of wherever they'd been. This hook
 * is additive: each dialog keeps owning its own Escape handling and
 * body-scroll-lock (they differ slightly), so wiring it in never changes
 * existing close behavior — it only adds the trap and the restore.
 */
export function useFocusTrap(
  containerRef: RefObject<HTMLElement>,
  active: boolean,
  initialFocusRef?: RefObject<HTMLElement>,
) {
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;

    const focusables = () =>
      Array.from(containerRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? []);

    (initialFocusRef?.current ?? focusables()[0])?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const els = focusables();
      if (els.length === 0) return;
      const first = els[0];
      const last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    const node = containerRef.current;
    node?.addEventListener('keydown', onKeyDown);
    return () => {
      node?.removeEventListener('keydown', onKeyDown);
      previouslyFocused.current?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
}
