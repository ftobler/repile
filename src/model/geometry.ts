/** Quarter-turn clockwise rotation in degrees. */
export type Rotation = 0 | 90 | 180 | 270;

/** Rectangle in unit fractions (0..1) of an image, origin top-left. */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Box in PDF user space (origin bottom-left). */
export interface PdfBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

type Point = [number, number];

export function normalizeRotation(deg: number): Rotation {
  const quarter = Math.round(deg / 90);
  return ((((quarter % 4) + 4) % 4) * 90) as Rotation;
}

function sourcePointToDisplay([u, v]: Point, rot: Rotation): Point {
  switch (rot) {
    case 0:
      return [u, v];
    case 90:
      return [1 - v, u];
    case 180:
      return [1 - u, 1 - v];
    case 270:
      return [v, 1 - u];
  }
}

function displayPointToSource([x, y]: Point, rot: Rotation): Point {
  switch (rot) {
    case 0:
      return [x, y];
    case 90:
      return [y, 1 - x];
    case 180:
      return [1 - x, 1 - y];
    case 270:
      return [1 - y, x];
  }
}

function mapRect(r: Rect, map: (p: Point) => Point): Rect {
  const [ax, ay] = map([r.x, r.y]);
  const [bx, by] = map([r.x + r.w, r.y + r.h]);
  const x = Math.min(ax, bx);
  const y = Math.min(ay, by);
  return { x, y, w: Math.max(ax, bx) - x, h: Math.max(ay, by) - y };
}

/** Rect drawn on the rotated (displayed) page -> rect on the unrotated source. */
export function displayRectToSource(r: Rect, rot: Rotation): Rect {
  if (rot === 0) return { ...r };
  return mapRect(r, (p) => displayPointToSource(p, rot));
}

/** Rect on the unrotated source -> rect on the rotated (displayed) page. */
export function sourceRectToDisplay(r: Rect, rot: Rotation): Rect {
  if (rot === 0) return { ...r };
  return mapRect(r, (p) => sourcePointToDisplay(p, rot));
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/** Normalizes negative extents and clips the rect to the unit square. */
export function clampRect(r: Rect): Rect {
  const x0 = clamp01(Math.min(r.x, r.x + r.w));
  const y0 = clamp01(Math.min(r.y, r.y + r.h));
  const x1 = clamp01(Math.max(r.x, r.x + r.w));
  const y1 = clamp01(Math.max(r.y, r.y + r.h));
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/** Pixel size of a source page after cropping and rotating. */
export function outputSize(width: number, height: number, rot: Rotation, crop: Rect | null) {
  const w = Math.round(width * (crop?.w ?? 1));
  const h = Math.round(height * (crop?.h ?? 1));
  return rot === 90 || rot === 270 ? { width: h, height: w } : { width: w, height: h };
}

export function cropToPdfBox(crop: Rect, box: PdfBox): PdfBox {
  return {
    x: box.x + crop.x * box.width,
    y: box.y + (1 - crop.y - crop.h) * box.height,
    width: crop.w * box.width,
    height: crop.h * box.height,
  };
}
