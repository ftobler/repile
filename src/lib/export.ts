import { PDFDocument, degrees } from 'pdf-lib';
import { zipSync } from 'fflate';
import { cropToPdfBox } from '../model/geometry';
import { exportFileName, type ExportFormat } from '../model/fileKind';
import type { Page } from '../model/pages';
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

/** One image for a single page, otherwise a zip with one image per page. */
export async function exportImages(pages: Page[], lookup: SourceLookup, format: 'png' | 'jpeg', firstName?: string) {
  const blobs = [];
  for (const page of pages) blobs.push(await rasterize(page, sourceOf(page, lookup), format));
  if (blobs.length === 1) return { blob: blobs[0], fileName: exportFileName(firstName, format) };

  const files: Record<string, [Uint8Array, { level: 0 }]> = {};
  for (let i = 0; i < blobs.length; i++) {
    files[exportFileName(firstName, format, i + 1)] = [new Uint8Array(await blobs[i].arrayBuffer()), { level: 0 }];
  }
  return { blob: new Blob([zipSync(files)], { type: 'application/zip' }), fileName: exportFileName(firstName, 'zip') };
}

export async function exportPages(
  pages: Page[],
  lookup: SourceLookup,
  format: ExportFormat,
  firstName?: string,
): Promise<ExportResult> {
  if (format === 'pdf') {
    const bytes = await exportPdf(pages, lookup);
    return { blob: new Blob([bytes as BlobPart], { type: 'application/pdf' }), fileName: exportFileName(firstName, 'pdf') };
  }
  return exportImages(pages, lookup, format, firstName);
}

export function download({ blob, fileName }: ExportResult) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
