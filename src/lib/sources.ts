import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { normalizeRotation, type Rotation } from '../model/geometry';
import { fileKind, type FileKind } from '../model/fileKind';
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
}

function memo<T>(fn: () => Promise<T>): () => Promise<T> {
  let p: Promise<T> | undefined;
  return () => (p ??= fn().catch((e) => ((p = undefined), Promise.reject(e))));
}

async function loadPdf(id: string, file: File, bytes: ArrayBuffer): Promise<Source> {
  // pdf.js transfers the buffer to its worker, so hand it a copy.
  const doc = await pdfjs.getDocument({ data: bytes.slice(0) }).promise;
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
  return { id, name: file.name, kind: 'pdf', mime: 'application/pdf', bytes, pages };
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

export async function loadSource(file: File): Promise<Source> {
  const kind = fileKind(file);
  if (!kind) throw new Error(`Unsupported file: ${file.name}`);
  const bytes = await file.arrayBuffer();
  const id = crypto.randomUUID();
  return kind === 'pdf' ? loadPdf(id, file, bytes) : loadImage(id, file, bytes);
}
