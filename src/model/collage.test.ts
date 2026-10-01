import { collageLayout, exportPixelSize, type Size } from './collage';

const sq = (n: number): Size => ({ width: n, height: n });
const rect = (width: number, height: number): Size => ({ width, height });

describe('collageLayout', () => {
  it('is empty without items', () => {
    expect(collageLayout([], 3)).toEqual({ width: 0, height: 0, items: [] });
  });

  it('puts items into rows of `perRow`, in order', () => {
    const { items } = collageLayout([sq(10), sq(10), sq(10), sq(10), sq(10)], 2);
    const ys = items.map((i) => i.y);
    expect(ys[0]).toBe(ys[1]);
    expect(ys[2]).toBe(ys[3]);
    expect(ys[2]).toBeGreaterThan(ys[0]);
    expect(ys[4]).toBeGreaterThan(ys[2]);
    expect(items[1].x).toBeGreaterThan(items[0].x);
  });

  it('gives every item in a row the same height and keeps aspect ratios', () => {
    const layout = collageLayout([rect(200, 100), sq(100)], 2);
    expect(layout).toEqual({
      width: 300,
      height: 100,
      items: [
        { x: 0, y: 0, width: 200, height: 100 },
        { x: 200, y: 0, width: 100, height: 100 },
      ],
    });
  });

  it('scales a row to its tallest item, never shrinking it', () => {
    const layout = collageLayout([rect(100, 50), sq(100)], 2);
    expect(layout.width).toBe(300);
    expect(layout.items[0]).toEqual({ x: 0, y: 0, width: 200, height: 100 });
  });

  it('stretches all full rows to the same width', () => {
    const layout = collageLayout([rect(200, 100), sq(100), sq(100), sq(100)], 2);
    expect(layout.width).toBe(300);
    expect(layout.height).toBe(250);
    expect(layout.items.slice(2)).toEqual([
      { x: 0, y: 100, width: 150, height: 150 },
      { x: 150, y: 100, width: 150, height: 150 },
    ]);
  });

  it('does not blow up a short last row beyond the other rows, but centres it', () => {
    const layout = collageLayout([sq(100), sq(100), sq(100)], 2);
    expect(layout.width).toBe(200);
    expect(layout.height).toBe(200);
    expect(layout.items[2]).toEqual({ x: 50, y: 100, width: 100, height: 100 });
  });

  it('justifies a short last row when that keeps it within the row height', () => {
    // Two 2:1 items fill the 300px width at a height of 75, below the full row height of 100.
    const layout = collageLayout([sq(100), sq(100), sq(100), rect(200, 100), rect(200, 100)], 3);
    expect(layout.width).toBe(300);
    expect(layout.items[3]).toEqual({ x: 0, y: 100, width: 150, height: 75 });
    expect(layout.items[4]).toEqual({ x: 150, y: 100, width: 150, height: 75 });
    expect(layout.height).toBe(175);
  });

  it('uses a single short row as is', () => {
    expect(collageLayout([sq(100)], 3)).toEqual({ width: 100, height: 100, items: [{ x: 0, y: 0, width: 100, height: 100 }] });
  });

  it('treats a row size below one as one item per row', () => {
    const layout = collageLayout([sq(10), sq(10)], 0);
    expect(layout.items.map((i) => i.y)).toEqual([0, 10]);
  });

  it('shrinks the whole collage to fit the size limits', () => {
    expect(collageLayout([rect(1000, 100)], 1, { maxSide: 500 })).toMatchObject({ width: 500, height: 50 });
    expect(collageLayout([sq(1000)], 1, { maxArea: 250_000 })).toMatchObject({ width: 500, height: 500 });
  });

  it('places items on whole pixels without gaps or overlaps', () => {
    const sizes = [rect(333, 211), rect(97, 401), rect(640, 480), rect(123, 457), rect(1001, 99), rect(55, 77), rect(400, 300)];
    const layout = collageLayout(sizes, 3);
    const rows = [layout.items.slice(0, 3), layout.items.slice(3, 6)];
    let y = 0;
    for (const row of rows) {
      let x = 0;
      for (const item of row) {
        expect(Number.isInteger(item.width) && Number.isInteger(item.height)).toBe(true);
        expect(item.x).toBe(x);
        expect(item.y).toBe(y);
        expect(item.height).toBe(row[0].height);
        x += item.width;
      }
      expect(x).toBe(layout.width);
      y += row[0].height;
    }
    const last = layout.items[6];
    expect(last.y).toBe(y);
    expect(last.y + last.height).toBe(layout.height);
  });
});

describe('exportPixelSize', () => {
  it('applies the raster scale, crop and rotation', () => {
    expect(exportPixelSize({ width: 100, height: 50 }, 2, 0, null)).toEqual({ width: 200, height: 100 });
    expect(exportPixelSize({ width: 100, height: 50 }, 1, 90, { x: 0, y: 0, w: 0.5, h: 1 })).toEqual({ width: 50, height: 50 });
    expect(exportPixelSize({ width: 100, height: 50 }, 1, 270, null)).toEqual({ width: 50, height: 100 });
  });
});
