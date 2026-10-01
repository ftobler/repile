import {
  clampRect,
  cropToPdfBox,
  displayRectToSource,
  normalizeRotation,
  outputSize,
  sourceRectToDisplay,
} from './geometry';

describe('normalizeRotation', () => {
  it.each([
    [0, 0],
    [90, 90],
    [360, 0],
    [450, 90],
    [-90, 270],
    [-450, 270],
  ])('%i -> %i', (input, expected) => {
    expect(normalizeRotation(input)).toBe(expected);
  });

  it('snaps to quarter turns', () => {
    expect(normalizeRotation(100)).toBe(90);
    expect(normalizeRotation(140)).toBe(180);
  });
});

describe('rect mapping between source and display space', () => {
  const rect = { x: 0.1, y: 0.2, w: 0.3, h: 0.4 };

  it('is the identity without rotation', () => {
    expect(displayRectToSource(rect, 0)).toEqual(rect);
    expect(sourceRectToDisplay(rect, 0)).toEqual(rect);
  });

  it('maps a top-left source corner to the top-right when rotated 90° clockwise', () => {
    const d = sourceRectToDisplay({ x: 0, y: 0, w: 0.5, h: 0.25 }, 90);
    expect(d.x).toBeCloseTo(0.75);
    expect(d.y).toBeCloseTo(0);
    expect(d.w).toBeCloseTo(0.25);
    expect(d.h).toBeCloseTo(0.5);
  });

  it('maps to the opposite corner at 180°', () => {
    const d = sourceRectToDisplay({ x: 0, y: 0, w: 0.5, h: 0.25 }, 180);
    expect(d.x).toBeCloseTo(0.5);
    expect(d.y).toBeCloseTo(0.75);
  });

  it.each([90, 180, 270] as const)('round-trips at %i°', (rot) => {
    const back = displayRectToSource(sourceRectToDisplay(rect, rot), rot);
    expect(back.x).toBeCloseTo(rect.x);
    expect(back.y).toBeCloseTo(rect.y);
    expect(back.w).toBeCloseTo(rect.w);
    expect(back.h).toBeCloseTo(rect.h);
  });
});

describe('clampRect', () => {
  it('keeps the rect inside the unit square', () => {
    expect(clampRect({ x: -0.2, y: 0.5, w: 0.5, h: 0.8 })).toEqual({ x: 0, y: 0.5, w: 0.3, h: 0.5 });
  });

  it('normalizes negative width/height (dragging up-left)', () => {
    const r = clampRect({ x: 0.6, y: 0.6, w: -0.2, h: -0.4 });
    expect(r.x).toBeCloseTo(0.4);
    expect(r.y).toBeCloseTo(0.2);
    expect(r.w).toBeCloseTo(0.2);
    expect(r.h).toBeCloseTo(0.4);
  });
});

describe('outputSize', () => {
  it('applies crop then rotation', () => {
    expect(outputSize(200, 100, 0, null)).toEqual({ width: 200, height: 100 });
    expect(outputSize(200, 100, 90, null)).toEqual({ width: 100, height: 200 });
    expect(outputSize(200, 100, 270, { x: 0, y: 0, w: 0.5, h: 0.5 })).toEqual({ width: 50, height: 100 });
  });
});

describe('cropToPdfBox', () => {
  it('converts a top-left based fraction rect into PDF user space (bottom-left origin)', () => {
    const box = { x: 0, y: 0, width: 600, height: 800 };
    expect(cropToPdfBox({ x: 0.5, y: 0, w: 0.5, h: 0.25 }, box)).toEqual({
      x: 300,
      y: 600,
      width: 300,
      height: 200,
    });
  });

  it('respects a box offset', () => {
    const box = { x: 10, y: 20, width: 100, height: 100 };
    expect(cropToPdfBox({ x: 0, y: 0.5, w: 1, h: 0.5 }, box)).toEqual({ x: 10, y: 20, width: 100, height: 50 });
  });
});
