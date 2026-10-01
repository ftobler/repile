import { dragCrop } from './cropDrag';

describe('dragCrop', () => {
  it('draws a new rect from the start point', () => {
    const r = dragCrop({ mode: 'draw', start: [0.2, 0.2] }, [0.6, 0.5]);
    expect(r.x).toBeCloseTo(0.2);
    expect(r.y).toBeCloseTo(0.2);
    expect(r.w).toBeCloseTo(0.4);
    expect(r.h).toBeCloseTo(0.3);
  });

  it('draws backwards', () => {
    const r = dragCrop({ mode: 'draw', start: [0.6, 0.6] }, [0.1, 0.4]);
    expect(r.x).toBeCloseTo(0.1);
    expect(r.y).toBeCloseTo(0.4);
    expect(r.w).toBeCloseTo(0.5);
    expect(r.h).toBeCloseTo(0.2);
  });

  it('moves an existing rect without leaving the page', () => {
    const rect = { x: 0.5, y: 0.5, w: 0.4, h: 0.4 };
    const r = dragCrop({ mode: 'move', start: [0.6, 0.6], rect }, [0.9, 0.7]);
    expect(r.x).toBeCloseTo(0.6);
    expect(r.y).toBeCloseTo(0.6);
    expect(r.w).toBeCloseTo(0.4);
  });

  it('resizes from a corner handle', () => {
    const rect = { x: 0.2, y: 0.2, w: 0.4, h: 0.4 };
    const r = dragCrop({ mode: 'resize', corner: 'nw', start: [0.2, 0.2], rect }, [0.1, 0.3]);
    expect(r.x).toBeCloseTo(0.1);
    expect(r.y).toBeCloseTo(0.3);
    expect(r.w).toBeCloseTo(0.5);
    expect(r.h).toBeCloseTo(0.3);
  });
});
