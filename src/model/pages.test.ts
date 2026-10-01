import { pagesReducer, type Page, type PagesState } from './pages';

const page = (id: string, extra: Partial<Page> = {}): Page => ({
  id,
  sourceId: 's1',
  pageIndex: 0,
  label: id,
  rotation: 0,
  crop: null,
  ...extra,
});

const state = (...ids: string[]): PagesState => ({ pages: ids.map((id) => page(id)) });
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

  it('clears everything', () => {
    expect(pagesReducer(state('a', 'b'), { type: 'clear' }).pages).toEqual([]);
  });

  it('does not mutate the previous state', () => {
    const s = state('a', 'b');
    const snapshot = structuredClone(s);
    pagesReducer(s, { type: 'rotate', id: 'a', by: 90 });
    pagesReducer(s, { type: 'move', id: 'a', overId: 'b' });
    expect(s).toEqual(snapshot);
  });
});
