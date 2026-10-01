import { PDFDocument, degrees } from 'pdf-lib';
import { collageLayout, exportPixelSize } from '../model/collage';
import { cropToPdfBox } from '../model/geometry';
import { exportFileName, type ExportFormat } from '../model/fileKind';
import { DEFAULT_PER_ROW, type Page } from '../model/pages';
import { PDF_EXPORT_SCALE, canvasToBlob, drawPage } from './render';
import type { Source } from './sources';

export type SourceLookup = (id: string) => Source | undefined;

export interface ExportResult {
  blob: Blob;
  fileName: string;
}

/** CSS pixels -> PDF points (96 dpi -> 72 dpi). */
const PX_TO_PT = 0.75;

function sourceOf(page: Page, lookup: SourceLookup): Source {
  const src = lookup(page.sourceId);
  if (!src) throw new Error(`Missing source for page ${page.label}`);
  return src;
}

async function rasterize(page: Page, source: Source, format: 'png' | 'jpeg') {
  const bitmap = await source.pages[page.pageIndex].render(PDF_EXPORT_SCALE);
  const canvas = drawPage(bitmap, {
    rotation: page.rotation,
    crop: page.crop,
    background: format === 'jpeg' ? '#ffffff' : undefined,
  });
  return canvasToBlob(canvas, format === 'png' ? 'image/png' : 'image/jpeg');
}

export async function exportPdf(pages: Page[], lookup: SourceLookup): Promise<Uint8Array> {
  const out = await PDFDocument.create();
  const loaded = new Map<string, Promise<PDFDocument>>();

  for (const page of pages) {
    const source = sourceOf(page, lookup);
    if (source.kind === 'pdf') {
      if (!loaded.has(source.id)) loaded.set(source.id, PDFDocument.load(source.bytes, { ignoreEncryption: true }));
      const doc = await loaded.get(source.id)!;
      const [copy] = await out.copyPages(doc, [page.pageIndex]);
      copy.setRotation(degrees(page.rotation));
      if (page.crop) {
        const box = cropToPdfBox(page.crop, copy.getCropBox());
        copy.setCropBox(box.x, box.y, box.width, box.height);
        copy.setTrimBox(box.x, box.y, box.width, box.height);
      }
      out.addPage(copy);
    } else {
      // Keep photos as JPEG, everything else lossless.
      const format = source.mime === 'image/jpeg' ? 'jpeg' : 'png';
      const blob = await rasterize({ ...page, rotation: 0 }, source, format);
      const data = new Uint8Array(await blob.arrayBuffer());
      const img = format === 'jpeg' ? await out.embedJpg(data) : await out.embedPng(data);
      const pdfPage = out.addPage([img.width * PX_TO_PT, img.height * PX_TO_PT]);
      pdfPage.drawImage(img, { x: 0, y: 0, width: pdfPage.getWidth(), height: pdfPage.getHeight() });
      pdfPage.setRotation(degrees(page.rotation));
    }
  }
  return out.save();
}

/** Raster scale of a source in image export: PDF pages in points, images 1:1. */
const rasterScale = (source: Source) => (source.kind === 'pdf' ? PDF_EXPORT_SCALE : 1);

/** All pages combined into one image, `perRow` per row (see collageLayout). */
export async function exportCollage(
  pages: Page[],
  lookup: SourceLookup,
  format: 'png' | 'jpeg',
  perRow: number,
  firstName?: string,
): Promise<ExportResult> {
  const sources = pages.map((p) => sourceOf(p, lookup));
  const sizes = pages.map((p, i) => exportPixelSize(sources[i].pages[p.pageIndex], rasterScale(sources[i]), p.rotation, p.crop));
  const layout = collageLayout(sizes, perRow);
  const background = format === 'jpeg' ? '#ffffff' : undefined;

  const canvas = document.createElement('canvas');
  canvas.width = layout.width;
  canvas.height = layout.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available');
  if (background) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, layout.width, layout.height);
  }
  ctx.imageSmoothingQuality = 'high';

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const bitmap = await sources[i].pages[page.pageIndex].render(rasterScale(sources[i]));
    const tile = drawPage(bitmap, { rotation: page.rotation, crop: page.crop, background });
    const { x, y, width, height } = layout.items[i];
    ctx.drawImage(tile, x, y, width, height);
  }

  const blob = await canvasToBlob(canvas, format === 'png' ? 'image/png' : 'image/jpeg');
  return { blob, fileName: exportFileName(firstName, format) };
}

export async function exportPages(
  pages: Page[],
  lookup: SourceLookup,
  format: ExportFormat,
  firstName?: string,
  perRow = DEFAULT_PER_ROW,
): Promise<ExportResult> {
  if (format === 'pdf') {
    const bytes = await exportPdf(pages, lookup);
    return { blob: new Blob([bytes as BlobPart], { type: 'application/pdf' }), fileName: exportFileName(firstName, 'pdf') };
  }
  return exportCollage(pages, lookup, format, perRow, firstName);
}

export function download({ blob, fileName }: ExportResult) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
