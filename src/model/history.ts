export const HISTORY_LIMIT = 100;

export interface History<S> {
  past: S[];
  present: S;
  future: S[];
}

export type HistoryAction<A> = A | { type: 'undo' } | { type: 'redo' };

export function initHistory<S>(present: S): History<S> {
  return { past: [], present, future: [] };
}

/**
 * Wraps a reducer with undo/redo. Actions that return the same state are not
 * recorded, so the wrapped reducer must return `state` itself for no-ops.
 */
export function withHistory<S, A extends { type: string }>(reducer: (state: S, action: A) => S) {
  return (history: History<S>, action: HistoryAction<A>): History<S> => {
    const { past, present, future } = history;
    if (action.type === 'undo') {
      if (past.length === 0) return history;
      return { past: past.slice(0, -1), present: past[past.length - 1], future: [present, ...future] };
    }
    if (action.type === 'redo') {
      if (future.length === 0) return history;
      return { past: [...past, present], present: future[0], future: future.slice(1) };
    }
    const next = reducer(present, action as A);
    if (next === present) return history;
    return { past: [...past, present].slice(-HISTORY_LIMIT), present: next, future: [] };
  };
}
