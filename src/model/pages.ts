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
}

export type PagesAction =
  | { type: 'add'; pages: Page[] }
  | { type: 'move'; id: string; overId: string }
  | { type: 'rotate'; id: string; by: number }
  | { type: 'rotateAll'; by: number }
  | { type: 'remove'; id: string }
  | { type: 'crop'; id: string; crop: Rect | null }
  | { type: 'duplicate'; id: string; newId: string }
  | { type: 'clear' };

export const initialPagesState: PagesState = { pages: [] };

function update(state: PagesState, id: string, fn: (p: Page) => Page): PagesState {
  return { pages: state.pages.map((p) => (p.id === id ? fn(p) : p)) };
}

export function pagesReducer(state: PagesState, action: PagesAction): PagesState {
  switch (action.type) {
    case 'add':
      return { pages: [...state.pages, ...action.pages] };
    case 'move': {
      const from = state.pages.findIndex((p) => p.id === action.id);
      const to = state.pages.findIndex((p) => p.id === action.overId);
      if (from < 0 || to < 0 || from === to) return state;
      const pages = [...state.pages];
      const [moved] = pages.splice(from, 1);
      pages.splice(to, 0, moved);
      return { pages };
    }
    case 'rotate':
      return update(state, action.id, (p) => ({ ...p, rotation: normalizeRotation(p.rotation + action.by) }));
    case 'rotateAll':
      return { pages: state.pages.map((p) => ({ ...p, rotation: normalizeRotation(p.rotation + action.by) })) };
    case 'remove':
      return { pages: state.pages.filter((p) => p.id !== action.id) };
    case 'crop':
      return update(state, action.id, (p) => ({ ...p, crop: action.crop }));
    case 'duplicate': {
      const i = state.pages.findIndex((p) => p.id === action.id);
      if (i < 0) return state;
      const pages = [...state.pages];
      pages.splice(i + 1, 0, { ...state.pages[i], id: action.newId });
      return { pages };
    }
    case 'clear':
      return initialPagesState;
  }
}
