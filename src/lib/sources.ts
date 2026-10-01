import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { normalizeRotation, type Rotation } from '../model/geometry';
import { SVG_MIME, fileKind, isSvg, type FileKind } from '../model/fileKind';
import { prepareSvg } from '../model/svg';
import type { Bitmap } from './render';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

/** Long side of tile previews in CSS pixels (scaled by devicePixelRatio). */
export const PREVIEW_SIZE = 520;

export interface SourcePage {
  /** Unrotated size: points for PDF pages, pixels for images. */
  width: number;
  height: number;
  /** Rotation the page already carries (PDF /Rotate). */
  initialRotation: Rotation;
  /** Image pixels per css pixel, for images rasterized above their intrinsic size (svg); default 1. */
  pixelRatio?: number;
  preview(): Promise<Bitmap>;
  /** Full-size raster; `scale` only applies to PDF pages. */
  render(scale: number): Promise<Bitmap>;
}

export interface Source {
  id: string;
  name: string;
  kind: FileKind;
  mime: string;
  bytes: ArrayBuffer;
  pages: SourcePage[];
  /** Releases the underlying document/bitmap. Safe to call once. */
  dispose?: () => void;
}

function memo<T>(fn: () => Promise<T>): () => Promise<T> {
  let p: Promise<T> | undefined;
  return () => (p ??= fn().catch((e) => ((p = undefined), Promise.reject(e))));
}

async function loadPdf(id: string, file: File, bytes: ArrayBuffer): Promise<Source> {
  // pdf.js transfers the buffer to its worker, so hand it a copy.
  const task = pdfjs.getDocument({ data: bytes.slice(0) });
  const doc = await task.promise;
  const pages: SourcePage[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const vp = page.getViewport({ scale: 1, rotation: 0 });
    const render = async (scale: number): Promise<Bitmap> => {
      const viewport = page.getViewport({ scale, rotation: 0 });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      await page.render({ canvas, viewport, background: 'white' }).promise;
      return { image: canvas, width: canvas.width, height: canvas.height };
    };
    pages.push({
      width: vp.width,
      height: vp.height,
      initialRotation: normalizeRotation(page.rotate),
      preview: memo(() =>
        render((PREVIEW_SIZE * (window.devicePixelRatio || 1)) / Math.max(vp.width, vp.height)),
      ),
      render,
    });
  }
  return { id, name: file.name, kind: 'pdf', mime: 'application/pdf', bytes, pages, dispose: () => void task.destroy() };
}

async function loadImage(id: string, file: File, bytes: ArrayBuffer): Promise<Source> {
  const bitmap = await createImageBitmap(new Blob([bytes], { type: file.type }));
  const full: Bitmap = { image: bitmap, width: bitmap.width, height: bitmap.height };
  return {
    id,
    name: file.name,
    kind: 'image',
    mime: file.type || 'image/png',
    bytes,
    dispose: () => bitmap.close(),
    pages: [
      {
        width: bitmap.width,
        height: bitmap.height,
        initialRotation: 0,
        preview: () => Promise.resolve(full),
        render: () => Promise.resolve(full),
      },
    ],
  };
}

function decodeImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not decode image'));
    img.src = url;
  });
}

/**
 * Rasterizes an svg once, at SVG_RASTER_SIZE on its longest side. It is drawn through an
 * <img> from a blob URL, so scripts inside it never run and external resources never load.
 */
async function loadSvg(id: string, file: File, bytes: ArrayBuffer): Promise<Source> {
  const svg = prepareSvg(new TextDecoder().decode(bytes));
  const url = URL.createObjectURL(new Blob([svg.markup], { type: SVG_MIME }));
  try {
    const img = await decodeImage(url);
    const canvas = document.createElement('canvas');
    canvas.width = svg.raster.width;
    canvas.height = svg.raster.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas is not available');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const full: Bitmap = { image: canvas, width: canvas.width, height: canvas.height };
    return {
      id,
      name: file.name,
      kind: 'image',
      mime: SVG_MIME,
      bytes,
      pages: [
        {
          width: full.width,
          height: full.height,
          initialRotation: 0,
          pixelRatio: full.width / svg.intrinsic.width,
          preview: () => Promise.resolve(full),
          render: () => Promise.resolve(full),
        },
      ],
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function loadSource(file: File): Promise<Source> {
  const kind = fileKind(file);
  if (!kind) throw new Error(`Unsupported file: ${file.name}`);
  const bytes = await file.arrayBuffer();
  const id = crypto.randomUUID();
  if (kind === 'pdf') return loadPdf(id, file, bytes);
  return isSvg(file) ? loadSvg(id, file, bytes) : loadImage(id, file, bytes);
}
