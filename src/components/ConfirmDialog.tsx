import { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

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
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
      if (e.key === 'Enter') onConfirm();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onConfirm, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-950/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-sm card p-6 animate-scale-in">
        <button
          onClick={onCancel}
          className="absolute right-4 top-4 rounded-lg p-1 text-ink-400 hover:text-ink-700 hover:bg-ink-100 transition"
        >
          <X size={16} />
        </button>
        <div className="flex items-start gap-3">
          <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${destructive ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>
            <AlertTriangle size={18} />
          </div>
          <div className="min-w-0">
            <h3 className="font-display text-base font-700 text-ink-900">{title}</h3>
            <p className="text-sm text-ink-500 mt-1 leading-relaxed">{message}</p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 mt-5">
          <button onClick={onCancel} className="btn-ghost">{cancelLabel}</button>
          <button
            onClick={onConfirm}
            className={destructive ? 'btn bg-rose-600 text-white hover:bg-rose-700' : 'btn-primary'}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
