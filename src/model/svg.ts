import type { Size } from './collage';

/** Intrinsic size (css px, square) for an svg without usable width, height or viewBox. */
export const DEFAULT_SVG_SIZE = 1024;

/**
 * Longest side, in pixels, an svg is rasterized at. Fixed rather than relative to the
 * intrinsic size so tiny icons stay crisp and huge drawings stay cheap; 2048 px is about
 * what a PDF page gets at the 144 dpi export scale (A4 = 1684 px, Letter = 1584 px).
 */
export const SVG_RASTER_SIZE = 2048;

const SVG_NS = 'http://www.w3.org/2000/svg';

/** CSS pixels per unit (96 dpi); font-relative units assume a 16px font. */
const UNIT_PX: Record<string, number> = {
  '': 1,
  px: 1,
  pt: 96 / 72,
  pc: 16,
  in: 96,
  cm: 96 / 2.54,
  mm: 96 / 25.4,
  q: 96 / 101.6,
  em: 16,
  rem: 16,
};

const LENGTH = /^([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)\s*([a-z]*)$/i;

/** An svg width/height attribute in css pixels, or null for missing, relative (%) or invalid values. */
export function parseSvgLength(value: string | null | undefined): number | null {
  const match = value?.trim().match(LENGTH);
  if (!match) return null;
  const unit = UNIT_PX[match[2].toLowerCase()];
  if (unit === undefined) return null;
  const px = Number(match[1]) * unit;
  return Number.isFinite(px) && px > 0 ? px : null;
}

function parseViewBox(value: string | null | undefined): Size | null {
  const parts = value?.trim().split(/[\s,]+/).map(Number);
  if (!parts || parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return null;
  const [, , width, height] = parts;
  return width > 0 && height > 0 ? { width, height } : null;
}

export interface SvgSizeAttributes {
  width?: string | null;
  height?: string | null;
  viewBox?: string | null;
}

/** Size of an svg in css pixels, from width/height, else the viewBox, else a default square. */
export function svgIntrinsicSize(attrs: SvgSizeAttributes): Size {
  const width = parseSvgLength(attrs.width);
  const height = parseSvgLength(attrs.height);
  const box = parseViewBox(attrs.viewBox);
  if (width && height) return { width, height };
  if (width) return { width, height: box ? (width * box.height) / box.width : width };
  if (height) return { width: box ? (height * box.width) / box.height : height, height };
  return box ?? { width: DEFAULT_SVG_SIZE, height: DEFAULT_SVG_SIZE };
}

/** Pixel size to rasterize at: the longest side becomes `longest`, keeping the aspect ratio. */
export function svgRasterSize(size: Size, longest = SVG_RASTER_SIZE): Size {
  const scale = longest / Math.max(size.width, size.height);
  return {
    width: Math.max(1, Math.round(size.width * scale)),
    height: Math.max(1, Math.round(size.height * scale)),
  };
}

export interface PreparedSvg {
  /** Size in css pixels. */
  intrinsic: Size;
  /** Size in pixels the markup now renders at. */
  raster: Size;
  /** The svg with its root sized to `raster`, ready to load into an <img>. */
  markup: string;
}

/**
 * Parses svg markup and pins its root element to the raster size, adding a viewBox where
 * needed so the drawing scales with it (an <img> without one may not scale or even draw).
 * Throws on malformed markup or documents that are not svg.
 */
export function prepareSvg(text: string): PreparedSvg {
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
  const root = doc.documentElement;
  if (!root || root.namespaceURI !== SVG_NS || root.localName !== 'svg' || doc.getElementsByTagName('parsererror').length) {
    throw new Error('Not a valid SVG document');
  }
  const intrinsic = svgIntrinsicSize({
    width: root.getAttribute('width'),
    height: root.getAttribute('height'),
    viewBox: root.getAttribute('viewBox'),
  });
  const raster = svgRasterSize(intrinsic);
  if (!parseViewBox(root.getAttribute('viewBox'))) root.setAttribute('viewBox', `0 0 ${intrinsic.width} ${intrinsic.height}`);
  root.setAttribute('width', String(raster.width));
  root.setAttribute('height', String(raster.height));
  return { intrinsic, raster, markup: new XMLSerializer().serializeToString(doc) };
}
