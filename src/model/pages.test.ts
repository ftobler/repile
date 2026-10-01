import { DEFAULT_PER_ROW, initialPagesState, pagesReducer, type Page, type PagesState } from './pages';

const page = (id: string, extra: Partial<Page> = {}): Page => ({
  id,
  sourceId: 's1',
  pageIndex: 0,
  label: id,
  rotation: 0,
  crop: null,
  ...extra,
});

const state = (...ids: string[]): PagesState => ({ ...initialPagesState, pages: ids.map((id) => page(id)) });
const ids = (s: PagesState) => s.pages.map((p) => p.id);

describe('pagesReducer', () => {
  it('appends pages', () => {
    const s = pagesReducer(state('a'), { type: 'add', pages: [page('b'), page('c')] });
    expect(ids(s)).toEqual(['a', 'b', 'c']);
  });

  it('moves a page onto the position of another', () => {
    expect(ids(pagesReducer(state('a', 'b', 'c', 'd'), { type: 'move', id: 'a', overId: 'c' }))).toEqual([
      'b',
      'c',
      'a',
      'd',
    ]);
    expect(ids(pagesReducer(state('a', 'b', 'c', 'd'), { type: 'move', id: 'd', overId: 'b' }))).toEqual([
      'a',
      'd',
      'b',
      'c',
    ]);
  });

  it('ignores moves with unknown ids', () => {
    const s = state('a', 'b');
    expect(pagesReducer(s, { type: 'move', id: 'a', overId: 'zzz' })).toBe(s);
  });

  it('rotates clockwise and counter-clockwise, wrapping around', () => {
    let s = pagesReducer(state('a'), { type: 'rotate', id: 'a', by: 90 });
    expect(s.pages[0].rotation).toBe(90);
    s = pagesReducer(s, { type: 'rotate', id: 'a', by: -180 });
    expect(s.pages[0].rotation).toBe(270);
  });

  it('rotates all pages', () => {
    const s = pagesReducer(state('a', 'b'), { type: 'rotateAll', by: 90 });
    expect(s.pages.map((p) => p.rotation)).toEqual([90, 90]);
  });

  it('removes a page', () => {
    expect(ids(pagesReducer(state('a', 'b', 'c'), { type: 'remove', id: 'b' }))).toEqual(['a', 'c']);
  });

  it('sets and clears the crop', () => {
    const crop = { x: 0.1, y: 0.1, w: 0.5, h: 0.5 };
    let s = pagesReducer(state('a'), { type: 'crop', id: 'a', crop });
    expect(s.pages[0].crop).toEqual(crop);
    s = pagesReducer(s, { type: 'crop', id: 'a', crop: null });
    expect(s.pages[0].crop).toBeNull();
  });

  it('duplicates a page right after the original with a new id', () => {
    const s = pagesReducer(state('a', 'b'), { type: 'duplicate', id: 'a', newId: 'a2' });
    expect(ids(s)).toEqual(['a', 'a2', 'b']);
    expect(s.pages[1]).toMatchObject({ sourceId: 's1', label: 'a' });
  });

  it('clears all pages but keeps the collage row size', () => {
    const s = pagesReducer({ ...state('a', 'b'), perRow: 5 }, { type: 'clear' });
    expect(s.pages).toEqual([]);
    expect(s.perRow).toBe(5);
  });

  it('sets the number of items per collage row', () => {
    expect(initialPagesState.perRow).toBe(DEFAULT_PER_ROW);
    const s = pagesReducer(state('a'), { type: 'perRow', value: 4 });
    expect(s.perRow).toBe(4);
    expect(s.pages).toEqual(state('a').pages);
    expect(pagesReducer(state('a'), { type: 'perRow', value: 0 }).perRow).toBe(1);
    expect(pagesReducer(state('a'), { type: 'perRow', value: 2.6 }).perRow).toBe(3);
  });

  it('keeps the row size through page edits', () => {
    let s: PagesState = { ...state('a', 'b'), perRow: 2 };
    s = pagesReducer(s, { type: 'move', id: 'a', overId: 'b' });
    s = pagesReducer(s, { type: 'rotateAll', by: 90 });
    s = pagesReducer(s, { type: 'remove', id: 'a' });
    s = pagesReducer(s, { type: 'duplicate', id: 'b', newId: 'c' });
    s = pagesReducer(s, { type: 'add', pages: [page('d')] });
    expect(s.perRow).toBe(2);
  });

  it('returns the same state for actions that change nothing', () => {
    const s = state('a');
    const empty = state();
    expect(pagesReducer(s, { type: 'rotate', id: 'zzz', by: 90 })).toBe(s);
    expect(pagesReducer(s, { type: 'rotate', id: 'a', by: 360 })).toBe(s);
    expect(pagesReducer(s, { type: 'remove', id: 'zzz' })).toBe(s);
    expect(pagesReducer(s, { type: 'crop', id: 'zzz', crop: null })).toBe(s);
    expect(pagesReducer(s, { type: 'crop', id: 'a', crop: null })).toBe(s);
    expect(pagesReducer(s, { type: 'add', pages: [] })).toBe(s);
    expect(pagesReducer(empty, { type: 'rotateAll', by: 90 })).toBe(empty);
    expect(pagesReducer(empty, { type: 'clear' })).toBe(empty);
    expect(pagesReducer(s, { type: 'perRow', value: s.perRow })).toBe(s);
  });

  it('does not mutate the previous state', () => {
    const s = state('a', 'b');
    const snapshot = structuredClone(s);
    pagesReducer(s, { type: 'rotate', id: 'a', by: 90 });
    pagesReducer(s, { type: 'move', id: 'a', overId: 'b' });
    expect(s).toEqual(snapshot);
  });
});
