import type { Source } from '../lib/sources';
import { initHistory, withHistory, type History, type HistoryAction } from './history';
import { initialPagesState, pagesReducer, referencedSourceIds, type PagesAction, type PagesState } from './pages';

export interface AppState {
  history: History<PagesState>;
  sources: ReadonlyMap<string, Source>;
}

export type AppAction = HistoryAction<PagesAction> | { type: 'source'; source: Source };

const reduceHistory = withHistory(pagesReducer);

export const initialAppState: AppState = { history: initHistory(initialPagesState), sources: new Map() };

/**
 * Reduces page history and the source registry together. Sources that no longer
 * appear in any reachable snapshot are dropped here; disposal is left to the
 * caller so the reducer stays pure.
 */
export function appReducer(state: AppState, action: AppAction): AppState {
  if (action.type === 'source') {
    return { ...state, sources: new Map(state.sources).set(action.source.id, action.source) };
  }
  const history = reduceHistory(state.history, action);
  if (history === state.history) return state;

  const referenced = referencedSourceIds([history.present, ...history.past, ...history.future]);
  let sources: Map<string, Source> | undefined;
  for (const id of state.sources.keys()) {
    if (referenced.has(id)) continue;
    sources ??= new Map(state.sources);
    sources.delete(id);
  }
  return sources ? { history, sources } : { history, sources: state.sources };
}

/** Sources present in `prev` but gone from `next`, i.e. ready to be disposed. */
export function droppedSources(prev: ReadonlyMap<string, Source>, next: ReadonlyMap<string, Source>): Source[] {
  const dropped: Source[] = [];
  for (const [id, source] of prev) if (!next.has(id)) dropped.push(source);
  return dropped;
}
