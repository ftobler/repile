import { PDFDocument } from 'pdf-lib';
import type { Page } from '../model/pages';
import { exportPages, exportPdf } from './export';
import type { Source } from './sources';

async function makePdf(sizes: [number, number][]): Promise<ArrayBuffer> {
  const doc = await PDFDocument.create();
  for (const size of sizes) doc.addPage(size);
  const bytes = await doc.save();
  return bytes.slice().buffer;
}

function pdfSource(id: string, bytes: ArrayBuffer, count: number): Source {
  const page = { width: 0, height: 0, initialRotation: 0 as const, preview: vi.fn(), render: vi.fn() };
  return { id, name: `${id}.pdf`, kind: 'pdf', mime: 'application/pdf', bytes, pages: Array(count).fill(page) };
}

const page = (sourceId: string, pageIndex: number, extra: Partial<Page> = {}): Page => ({
  id: `${sourceId}-${pageIndex}`,
  sourceId,
  pageIndex,
  label: String(pageIndex + 1),
  rotation: 0,
  crop: null,
  ...extra,
});

describe('exportPdf', () => {
  it('writes pages in the new order, from several files, with rotation and crop', async () => {
    const a = pdfSource('a', await makePdf([[100, 200], [300, 400]]), 2);
    const b = pdfSource('b', await makePdf([[500, 600]]), 1);
    const lookup = (id: string) => ({ a, b })[id];

    const bytes = await exportPdf(
      [
        page('a', 1, { rotation: 90 }),
        page('b', 0, { crop: { x: 0.5, y: 0, w: 0.5, h: 0.5 } }),
        page('a', 0),
        page('a', 1),
      ],
      lookup,
    );

    const out = await PDFDocument.load(bytes);
    const pages = out.getPages();
    expect(pages.map((p) => p.getMediaBox().width)).toEqual([300, 500, 100, 300]);
    expect(pages[0].getRotation().angle).toBe(90);
    expect(pages[3].getRotation().angle).toBe(0);
    expect(pages[1].getCropBox()).toEqual({ x: 250, y: 300, width: 250, height: 300 });
  });

  it('fails clearly when a source is missing', async () => {
    await expect(exportPdf([page('nope', 0)], () => undefined)).rejects.toThrow(/Missing source/);
  });
});

describe('exportPages', () => {
  it('names the pdf after the first file', async () => {
    const a = pdfSource('a', await makePdf([[100, 100]]), 1);
    const result = await exportPages([page('a', 0)], () => a, 'pdf', 'scan.pdf');
    expect(result.fileName).toBe('scan-repiled.pdf');
    expect(result.blob.type).toBe('application/pdf');
  });
});
