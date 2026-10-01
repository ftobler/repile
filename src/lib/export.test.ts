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

describe('image export', () => {
  interface FakeCtx {
    canvas: HTMLCanvasElement;
    drawImage: ReturnType<typeof vi.fn>;
    fillRect: ReturnType<typeof vi.fn>;
    fillStyle?: string;
  }
  let contexts: FakeCtx[];

  beforeEach(() => {
    contexts = [];
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
      const ctx = { canvas: this, drawImage: vi.fn(), fillRect: vi.fn(), translate: vi.fn(), rotate: vi.fn() };
      contexts.push(ctx);
      return ctx as unknown as CanvasRenderingContext2D;
    } as unknown as HTMLCanvasElement['getContext']);
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (cb, type) {
      cb(new Blob(['img'], { type }));
    });
  });

  afterEach(() => vi.restoreAllMocks());

  function imageSource(id: string, width: number, height: number): Source {
    const bitmap = { image: document.createElement('canvas'), width, height };
    const p = { width, height, initialRotation: 0 as const, preview: vi.fn(), render: vi.fn(async () => bitmap) };
    return { id, name: `${id}.png`, kind: 'image', mime: 'image/png', bytes: new ArrayBuffer(0), pages: [p] };
  }

  const collageCtx = () => contexts.find((c) => c.drawImage.mock.calls.some((args) => args.length === 5))!;

  it('combines all pages into one row-based collage image', async () => {
    const a = imageSource('a', 200, 100);
    const b = imageSource('b', 100, 100);
    const c = imageSource('c', 100, 100);
    const lookup = (id: string) => ({ a, b, c })[id];

    const result = await exportPages([page('a', 0), page('b', 0), page('c', 0), page('c', 0, { id: 'c2' })], lookup, 'png', 'a.png', 2);

    expect(result.fileName).toBe('a-repiled.png');
    expect(result.blob.type).toBe('image/png');
    const ctx = collageCtx();
    expect([ctx.canvas.width, ctx.canvas.height]).toEqual([300, 250]);
    expect(ctx.drawImage.mock.calls.map((args) => args.slice(1))).toEqual([
      [0, 0, 200, 100],
      [200, 0, 100, 100],
      [0, 100, 150, 150],
      [150, 100, 150, 150],
    ]);
  });

  it('respects rotation and fills jpeg backgrounds white', async () => {
    const a = imageSource('a', 200, 100);
    const b = imageSource('b', 100, 100);
    const lookup = (id: string) => ({ a, b })[id];

    const result = await exportPages([page('a', 0, { rotation: 90 }), page('b', 0)], lookup, 'jpeg', undefined, 2);

    expect(result.fileName).toBe('repile-repiled.jpg');
    expect(result.blob.type).toBe('image/jpeg');
    const ctx = collageCtx();
    // the rotated 100x200 page and the square share a height of 200
    expect([ctx.canvas.width, ctx.canvas.height]).toEqual([300, 200]);
    expect(ctx.drawImage.mock.calls.map((args) => args.slice(1))).toEqual([
      [0, 0, 100, 200],
      [100, 0, 200, 200],
    ]);
    expect(ctx.fillStyle).toBe('#ffffff');
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 300, 200);
  });

  it('rasterizes pdf pages at the export scale', async () => {
    const pdf = pdfSource('p', new ArrayBuffer(0), 1);
    const bitmap = { image: document.createElement('canvas'), width: 200, height: 400 };
    pdf.pages = [{ ...pdf.pages[0], width: 100, height: 200, render: vi.fn(async () => bitmap) }];

    await exportPages([page('p', 0)], () => pdf, 'png', 'p.pdf', 3);

    expect(pdf.pages[0].render).toHaveBeenCalledWith(2);
    const ctx = collageCtx();
    expect([ctx.canvas.width, ctx.canvas.height]).toEqual([200, 400]);
  });
});
