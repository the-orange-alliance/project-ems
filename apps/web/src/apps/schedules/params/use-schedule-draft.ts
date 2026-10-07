import { ScheduleParams } from '@toa-lib/models';
import { useCallback, useEffect, useRef, useState } from 'react';

export type SaveStatus = 'saved' | 'unsaved' | 'saving' | 'error';

const AUTOSAVE_DELAY_MS = 800;

/**
 * Local, instantly editable copy of the schedule parameters. Edits are saved
 * after a short pause (and when the editor unmounts) rather than on every
 * keystroke, and incoming server data never overwrites unsaved edits.
 */
export const useScheduleDraft = (
  saved: ScheduleParams,
  save: (schedule: ScheduleParams) => void | Promise<void>,
  onError: (error: unknown) => void
) => {
  const [draft, setDraft] = useState(saved);
  const [status, setStatus] = useState<SaveStatus>('saved');
  const latest = useRef(draft);
  const edits = useRef(0);
  const savedEdits = useRef(0);
  const running = useRef<Promise<boolean> | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const saveRef = useRef(save);
  const onErrorRef = useRef(onError);
  saveRef.current = save;
  onErrorRef.current = onError;

  const saveAll = useCallback(async () => {
    try {
      // Edits made during a save are picked up by the next pass.
      while (edits.current !== savedEdits.current) {
        const covered = edits.current;
        setStatus('saving');
        await saveRef.current(latest.current);
        savedEdits.current = covered;
      }
      setStatus('saved');
      return true;
    } catch (e) {
      setStatus('error');
      onErrorRef.current(e);
      return false;
    }
  }, []);

  /** Saves pending edits now; resolves to whether everything is saved. */
  const flush = useCallback(() => {
    window.clearTimeout(timer.current);
    running.current ??= saveAll().finally(() => {
      running.current = null;
    });
    return running.current;
  }, [saveAll]);

  const update = useCallback(
    (next: ScheduleParams) => {
      latest.current = next;
      edits.current++;
      setDraft(next);
      setStatus('unsaved');
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(flush, AUTOSAVE_DELAY_MS);
    },
    [flush]
  );

  // Adopt changes from the server only while nothing local is waiting to save.
  const savedJson = JSON.stringify(saved);
  useEffect(() => {
    if (edits.current !== savedEdits.current) return;
    latest.current = saved;
    setDraft(saved);
  }, [savedJson]);

  useEffect(() => () => void flush(), [flush]);

  return { draft, status, update, flush };
};
