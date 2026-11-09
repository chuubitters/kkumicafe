import { useCallback, useRef, useState } from 'react';

type Upd<T> = T | ((prev: T) => T);

/** Undo/redo history. "live" updates change the present without a history entry;
 *  begin()/end() wrap a gesture (drag, piping stroke, slider) so it becomes one undo step. */
export function useHistory<T>(initial: T, limit = 80) {
  const [h, setH] = useState<{ past: T[]; present: T; future: T[] }>({ past: [], present: initial, future: [] });
  const gesture = useRef<T | null>(null);
  const present = useRef(h.present);
  present.current = h.present;

  const set = useCallback((u: Upd<T>, mode: 'commit' | 'live' = 'commit') => {
    const inGesture = !!gesture.current;
    setH((s) => {
      const next = typeof u === 'function' ? (u as (p: T) => T)(s.present) : u;
      if (next === s.present) return s;
      if (mode === 'live' || inGesture) return { ...s, present: next };
      return { past: [...s.past, s.present].slice(-limit), present: next, future: [] };
    });
  }, [limit]);

  const begin = useCallback(() => { if (!gesture.current) gesture.current = present.current; }, []);
  const end = useCallback(() => {
    const start = gesture.current; gesture.current = null;
    if (!start) return;
    setH((s) => (start === s.present ? s : { past: [...s.past, start].slice(-limit), present: s.present, future: [] }));
  }, [limit]);
  const undo = useCallback(() => setH((s) => (s.past.length ? { past: s.past.slice(0, -1), present: s.past[s.past.length - 1], future: [s.present, ...s.future] } : s)), []);
  const redo = useCallback(() => setH((s) => (s.future.length ? { past: [...s.past, s.present], present: s.future[0], future: s.future.slice(1) } : s)), []);

  return { state: h.present, set, begin, end, undo, redo, canUndo: h.past.length > 0, canRedo: h.future.length > 0 };
}
