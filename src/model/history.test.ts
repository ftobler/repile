import { withHistory, initHistory, HISTORY_LIMIT } from './history';

type Action = { type: 'inc' } | { type: 'noop' };
const counter = (n: number, a: Action) => (a.type === 'inc' ? n + 1 : n);
const reducer = withHistory(counter);

const run = (...actions: Parameters<typeof reducer>[1][]) => actions.reduce(reducer, initHistory(0));

describe('withHistory', () => {
  it('passes actions through to the wrapped reducer', () => {
    expect(run({ type: 'inc' }, { type: 'inc' }).present).toBe(2);
  });

  it('undoes and redoes', () => {
    let s = run({ type: 'inc' }, { type: 'inc' }, { type: 'undo' });
    expect(s.present).toBe(1);
    s = reducer(s, { type: 'undo' });
    expect(s.present).toBe(0);
    s = reducer(s, { type: 'redo' });
    expect(s.present).toBe(1);
  });

  it('ignores undo/redo with nothing to undo/redo', () => {
    const s = initHistory(0);
    expect(reducer(s, { type: 'undo' })).toBe(s);
    expect(reducer(s, { type: 'redo' })).toBe(s);
  });

  it('drops the redo stack on a new change', () => {
    const s = run({ type: 'inc' }, { type: 'inc' }, { type: 'undo' }, { type: 'inc' });
    expect(s.present).toBe(2);
    expect(s.future).toEqual([]);
  });

  it('does not record actions that change nothing', () => {
    const s = run({ type: 'inc' }, { type: 'noop' });
    expect(s.past).toHaveLength(1);
    expect(reducer(s, { type: 'noop' })).toBe(s);
  });

  it(`keeps at most ${HISTORY_LIMIT} steps`, () => {
    const s = run(...Array.from({ length: HISTORY_LIMIT + 10 }, () => ({ type: 'inc' }) as const));
    expect(s.past).toHaveLength(HISTORY_LIMIT);
    expect(s.past[0]).toBe(10);
  });
});
