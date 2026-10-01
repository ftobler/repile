import { fileKind, exportFileName, isSvg } from './fileKind';

const file = (name: string, type: string) => new File(['x'], name, { type });

describe('fileKind', () => {
  it('detects pdfs by mime type or extension', () => {
    expect(fileKind(file('a.pdf', 'application/pdf'))).toBe('pdf');
    expect(fileKind(file('A.PDF', ''))).toBe('pdf');
  });

  it('detects images', () => {
    expect(fileKind(file('a.png', 'image/png'))).toBe('image');
    expect(fileKind(file('a.jpeg', ''))).toBe('image');
    expect(fileKind(file('a.webp', 'image/webp'))).toBe('image');
  });

  it('detects svgs as images by mime type or extension', () => {
    expect(fileKind(file('a.svg', 'image/svg+xml'))).toBe('image');
    expect(fileKind(file('drawing', 'image/svg+xml'))).toBe('image');
    expect(fileKind(file('A.SVG', ''))).toBe('image');
  });

  it('rejects everything else', () => {
    expect(fileKind(file('a.txt', 'text/plain'))).toBeNull();
    expect(fileKind(file('a.svg.txt', ''))).toBeNull();
    expect(fileKind(file('a.svgz', ''))).toBeNull();
  });
});

describe('isSvg', () => {
  it('detects svgs by mime type, or by extension when the mime type is empty', () => {
    expect(isSvg(file('a.svg', 'image/svg+xml'))).toBe(true);
    expect(isSvg(file('drawing', 'image/svg+xml'))).toBe(true);
    expect(isSvg(file('a.Svg', ''))).toBe(true);
    expect(isSvg(file('a.png', 'image/png'))).toBe(false);
    expect(isSvg(file('a.svg', 'image/png'))).toBe(false);
  });
});

describe('exportFileName', () => {
  it('uses the base name of the first file', () => {
    expect(exportFileName('scan.pdf', 'pdf')).toBe('scan-repiled.pdf');
    expect(exportFileName('photo.final.jpg', 'png')).toBe('photo.final-repiled.png');
  });

  it('falls back to "repile"', () => {
    expect(exportFileName(undefined, 'jpeg')).toBe('repile-repiled.jpg');
  });
});
