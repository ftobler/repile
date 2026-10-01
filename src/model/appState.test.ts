import { appReducer, droppedSources, initialAppState } from './appState';
import type { Source } from '../lib/sources';
import type { Page } from './pages';

function source(id: string): Source {
  return {
    id,
    name: `${id}.png`,
    kind: 'image',
    mime: 'image/png',
    bytes: new ArrayBuffer(0),
    pages: [],
    dispose: vi.fn(),
  };
}

const page = (id: string, sourceId: string): Page => ({ id, sourceId, pageIndex: 0, label: id, rotation: 0, crop: null });

describe('appReducer', () => {
  it('registers a source without dropping it before its pages arrive', () => {
    const src = source('s1');
    const s = appReducer(initialAppState, { type: 'source', source: src });
    expect(s.sources.get('s1')).toBe(src);
  });

  it('drops sources that no reachable snapshot references', () => {
    const orphan = source('orphan');
    const s0 = { ...initialAppState, sources: new Map([['orphan', orphan]]) };
    const s1 = appReducer(s0, { type: 'add', pages: [page('p1', 's1')] });
    expect(s1.sources.has('orphan')).toBe(false);
    expect(droppedSources(s0.sources, s1.sources)).toEqual([orphan]);
  });

  it('keeps a source while history can still bring its pages back', () => {
    const src = source('s1');
    let s = appReducer(initialAppState, { type: 'source', source: src });
    s = appReducer(s, { type: 'add', pages: [page('p1', 's1')] });
    s = appReducer(s, { type: 'remove', id: 'p1' });
    expect(s.sources.has('s1')).toBe(true);

    s = appReducer(s, { type: 'undo' });
    expect(s.history.present.pages).toHaveLength(1);
  });
});

describe('droppedSources', () => {
  it('reports nothing when every source is still present', () => {
    const a = source('a');
    const b = source('b');
    expect(droppedSources(new Map([['a', a]]), new Map([['a', b]]))).toEqual([]);
  });
});
