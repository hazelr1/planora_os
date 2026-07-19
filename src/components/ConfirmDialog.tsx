import { useEffect, useRef } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Default focus lands on Cancel, not Confirm — for a destructive dialog
  // specifically, an accidental Enter/Space press right after it opens
  // should do nothing, not delete something. Reaching the destructive
  // action requires a deliberate Tab or click.
  useFocusTrap(containerRef, isOpen, cancelRef);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div ref={containerRef} className="relative w-full max-w-sm card p-6 animate-scale-in" role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title">
        <button
          onClick={onCancel}
          className="absolute right-4 top-4 rounded-lg p-1 text-ink-500 hover:text-ink-800 hover:bg-glass/5 transition"
          aria-label="Close"
        >
          <X size={16} />
        </button>
        <div className="flex items-start gap-3">
          <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${destructive ? 'bg-rose-500/15 text-rose-800 dark:text-rose-400' : 'bg-amber-500/15 text-amber-800 dark:text-amber-400'}`}>
            <AlertTriangle size={18} />
          </div>
          <div className="min-w-0">
            <h3 id="confirm-dialog-title" className="font-display text-base font-700 text-ink-900">{title}</h3>
            <p className="text-sm text-ink-600 mt-1 leading-relaxed">{message}</p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 mt-5">
          <button ref={cancelRef} onClick={onCancel} className="btn-ghost">{cancelLabel}</button>
          <button
            onClick={onConfirm}
            className={destructive ? 'btn-danger' : 'btn-primary'}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
