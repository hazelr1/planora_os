import { useState, useCallback, useRef } from 'react';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface SaveStatusHook {
  status: SaveStatus;
  isSaving: boolean;
  errorMessage: string | null;
  /** Wraps an async DB action with saving/saved/error state tracking. */
  track: (action: () => Promise<void>) => Promise<void>;
  /** Re-runs the last failed action. Null when status is not 'error'. */
  retry: (() => void) | null;
}

export function useSaveStatus(): SaveStatusHook {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const lastAction = useRef<(() => Promise<void>) | undefined>(undefined);
  const savedTimer = useRef<ReturnType<typeof setTimeout>>();

  const track = useCallback(async (action: () => Promise<void>) => {
    lastAction.current = action;
    if (savedTimer.current) clearTimeout(savedTimer.current);
    setStatus('saving');
    setErrorMessage(null);
    try {
      await action();
      setStatus('saved');
      savedTimer.current = setTimeout(() => {
        setStatus((s) => (s === 'saved' ? 'idle' : s));
      }, 2500);
    } catch (e) {
      setStatus('error');
      setErrorMessage(e instanceof Error ? e.message : 'Save failed. Please try again.');
    }
  }, []);

  const retry = useCallback(() => {
    if (lastAction.current) void track(lastAction.current);
  }, [track]);

  return {
    status,
    isSaving: status === 'saving',
    errorMessage,
    track,
    retry: status === 'error' ? retry : null,
  };
}
