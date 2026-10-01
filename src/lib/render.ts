import { outputSize, type Rect, type Rotation } from '../model/geometry';

/** Raster scale for PDF pages when exporting to images (2 = 144 dpi). */
export const PDF_EXPORT_SCALE = 2;

export interface Bitmap {
  image: CanvasImageSource;
  width: number;
  height: number;
}

export interface DrawOptions {
  rotation: Rotation;
  crop: Rect | null;
  /** Longest side of the result in pixels; the page is never upscaled. */
  maxSize?: number;
  /** Fill colour behind transparent pixels (needed for JPEG). */
  background?: string;
}

/** Crops, rotates and scales a bitmap into `target` (or a new canvas). */
export function drawPage(src: Bitmap, opts: DrawOptions, target = document.createElement('canvas')): HTMLCanvasElement {
  const { rotation, crop } = opts;
  const full = outputSize(src.width, src.height, rotation, crop);
  const scale = opts.maxSize ? Math.min(1, opts.maxSize / Math.max(full.width, full.height, 1)) : 1;
  target.width = Math.max(1, Math.round(full.width * scale));
  target.height = Math.max(1, Math.round(full.height * scale));

  const ctx = target.getContext('2d');
  if (!ctx) return target;

  if (opts.background) {
    ctx.fillStyle = opts.background;
    ctx.fillRect(0, 0, target.width, target.height);
  }

  const c = crop ?? { x: 0, y: 0, w: 1, h: 1 };
  const sw = c.w * src.width;
  const sh = c.h * src.height;
  const quarter = rotation === 90 || rotation === 270;
  const dw = (quarter ? target.height : target.width);
  const dh = (quarter ? target.width : target.height);

  ctx.imageSmoothingQuality = 'high';
  ctx.translate(target.width / 2, target.height / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.drawImage(src.image, c.x * src.width, c.y * src.height, sw, sh, -dw / 2, -dh / 2, dw, dh);
  return target;
}

export function canvasToBlob(canvas: HTMLCanvasElement, type: 'image/png' | 'image/jpeg', quality = 0.92): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not encode image'))), type, quality),
  );
}
