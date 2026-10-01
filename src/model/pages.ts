import { normalizeRotation, type Rect, type Rotation } from './geometry';

export interface Page {
  id: string;
  /** Key into the source registry (one entry per loaded file). */
  sourceId: string;
  /** Page number inside the source, 0-based. Always 0 for images. */
  pageIndex: number;
  label: string;
  rotation: Rotation;
  /** Crop in fractions of the unrotated source page, or null for none. */
  crop: Rect | null;
}

export interface PagesState {
  pages: Page[];
  /** Items per row when the pages are combined into one collage image. */
  perRow: number;
}

export type PagesAction =
  | { type: 'add'; pages: Page[] }
  | { type: 'move'; id: string; overId: string }
  | { type: 'rotate'; id: string; by: number }
  | { type: 'rotateAll'; by: number }
  | { type: 'remove'; id: string }
  | { type: 'crop'; id: string; crop: Rect | null }
  | { type: 'duplicate'; id: string; newId: string }
  | { type: 'clear' }
  | { type: 'perRow'; value: number };

export const DEFAULT_PER_ROW = 3;

export const initialPagesState: PagesState = { pages: [], perRow: DEFAULT_PER_ROW };

/** Applies `fn` to one page; returns `state` itself if nothing changed. */
function update(state: PagesState, id: string, fn: (p: Page) => Page): PagesState {
  let changed = false;
  const pages = state.pages.map((p) => {
    if (p.id !== id) return p;
    const next = fn(p);
    changed ||= next !== p;
    return next;
  });
  return changed ? { ...state, pages } : state;
}

function rotated(p: Page, by: number): Page {
  const rotation = normalizeRotation(p.rotation + by);
  return rotation === p.rotation ? p : { ...p, rotation };
}

function sameRect(a: Rect | null, b: Rect | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;
}

/** Source ids referenced by any of the given states, including history snapshots. */
export function referencedSourceIds(states: PagesState[]): Set<string> {
  const ids = new Set<string>();
  for (const state of states) for (const page of state.pages) ids.add(page.sourceId);
  return ids;
}

export function pagesReducer(state: PagesState, action: PagesAction): PagesState {
  switch (action.type) {
    case 'add':
      return action.pages.length ? { ...state, pages: [...state.pages, ...action.pages] } : state;
    case 'move': {
      const from = state.pages.findIndex((p) => p.id === action.id);
      const to = state.pages.findIndex((p) => p.id === action.overId);
      if (from < 0 || to < 0 || from === to) return state;
      const pages = [...state.pages];
      const [moved] = pages.splice(from, 1);
      pages.splice(to, 0, moved);
      return { ...state, pages };
    }
    case 'rotate':
      return update(state, action.id, (p) => rotated(p, action.by));
    case 'rotateAll':
      if (state.pages.length === 0 || normalizeRotation(action.by) === 0) return state;
      return { ...state, pages: state.pages.map((p) => rotated(p, action.by)) };
    case 'remove': {
      const pages = state.pages.filter((p) => p.id !== action.id);
      return pages.length === state.pages.length ? state : { ...state, pages };
    }
    case 'crop':
      return update(state, action.id, (p) => (sameRect(p.crop, action.crop) ? p : { ...p, crop: action.crop }));
    case 'duplicate': {
      const i = state.pages.findIndex((p) => p.id === action.id);
      if (i < 0) return state;
      const pages = [...state.pages];
      pages.splice(i + 1, 0, { ...state.pages[i], id: action.newId });
      return { ...state, pages };
    }
    case 'clear':
      return state.pages.length ? { ...state, pages: [] } : state;
    case 'perRow': {
      if (!Number.isFinite(action.value)) return state;
      const perRow = Math.max(1, Math.round(action.value));
      return perRow === state.perRow ? state : { ...state, perRow };
    }
  }
}
