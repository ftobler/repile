import { outputSize, type Rect, type Rotation } from './geometry';

export interface Size {
  width: number;
  height: number;
}

export interface Placement {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CollageLayout {
  width: number;
  height: number;
  /** One placement per input size, in the same order. */
  items: Placement[];
}

export interface CollageLimits {
  /** Longest side of the collage in pixels. */
  maxSide?: number;
  /** Pixel count of the collage. */
  maxArea?: number;
}

/** Choices offered for the number of items per collage row. */
export const PER_ROW_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

/** Stays inside what browsers can allocate for a canvas. */
export const MAX_COLLAGE_SIDE = 16384;
export const MAX_COLLAGE_AREA = 64_000_000;

/** Pixel size a page is rasterized at for image export. */
export function exportPixelSize(source: Size, scale: number, rotation: Rotation, crop: Rect | null): Size {
  return outputSize(Math.ceil(source.width * scale), Math.ceil(source.height * scale), rotation, crop);
}

const aspect = ({ width, height }: Size) => Math.max(width, 1e-6) / Math.max(height, 1e-6);

/**
 * Arranges items row by row, `perRow` per row, in order. Items in a row share
 * one height (aspect ratios kept) and every full row is stretched to the same
 * width, so the collage is a clean rectangle. A shorter last row is stretched
 * too, but never taller than the tallest full row; then it is centred.
 *
 * The width is the widest row at its natural size (the row scaled to its
 * tallest item), so nothing is shrunk unless the limits require it.
 */
export function collageLayout(sizes: Size[], perRow: number, limits: CollageLimits = {}): CollageLayout {
  if (sizes.length === 0) return { width: 0, height: 0, items: [] };
  const { maxSide = MAX_COLLAGE_SIDE, maxArea = MAX_COLLAGE_AREA } = limits;
  const n = Math.max(1, Math.floor(perRow));

  const rows: Size[][] = [];
  for (let i = 0; i < sizes.length; i += n) rows.push(sizes.slice(i, i + n));
  const ratios = rows.map((row) => row.reduce((sum, s) => sum + aspect(s), 0));
  const naturalWidths = rows.map((row, r) => Math.max(...row.map((s) => s.height)) * ratios[r]);

  const isShort = (r: number) => rows.length > 1 && r === rows.length - 1 && rows[r].length < n;
  const full = rows.map((_, r) => r).filter((r) => !isShort(r));
  const width = Math.max(...full.map((r) => naturalWidths[r]));
  const maxFullHeight = Math.max(...full.map((r) => width / ratios[r]));

  // Float layout: per row its height, width and left offset.
  const rowBoxes = rows.map((_, r) => {
    const height = isShort(r) ? Math.min(width / ratios[r], maxFullHeight) : width / ratios[r];
    const rowWidth = height * ratios[r];
    return { height, width: rowWidth, left: (width - rowWidth) / 2 };
  });
  const height = rowBoxes.reduce((sum, b) => sum + b.height, 0);

  const scale = Math.min(1, maxSide / width, maxSide / height, Math.sqrt(maxArea / (width * height)));

  // Round edges rather than sizes, so neighbours meet without gaps.
  const items: Placement[] = [];
  let top = 0;
  rows.forEach((row, r) => {
    const box = rowBoxes[r];
    const y0 = Math.round(top * scale);
    const y1 = Math.round((top + box.height) * scale);
    let left = box.left;
    for (const size of row) {
      const w = box.height * aspect(size);
      const x0 = Math.round(left * scale);
      const x1 = Math.round((left + w) * scale);
      items.push({ x: x0, y: y0, width: x1 - x0, height: y1 - y0 });
      left += w;
    }
    top += box.height;
  });

  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)), items };
}
