export type FileKind = 'pdf' | 'image';
export type ExportFormat = 'pdf' | 'png' | 'jpeg';

const IMAGE_EXT = /\.(png|jpe?g|webp|gif|bmp|avif|svg)$/i;
const IMAGE_MIME = /^image\/(png|jpeg|webp|gif|bmp|avif|svg\+xml)$/;
export const SVG_MIME = 'image/svg+xml';

export function fileKind(file: File): FileKind | null {
  if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) return 'pdf';
  if (IMAGE_MIME.test(file.type) || (!file.type && IMAGE_EXT.test(file.name))) return 'image';
  return null;
}

/** SVGs count as images but are rasterized on load (some browsers give no mime type). */
export function isSvg(file: File): boolean {
  return file.type === SVG_MIME || (!file.type && /\.svg$/i.test(file.name));
}

const EXT: Record<ExportFormat, string> = { pdf: 'pdf', png: 'png', jpeg: 'jpg' };

export function exportFileName(firstName: string | undefined, format: ExportFormat): string {
  const base = firstName ? firstName.replace(/\.[^.]+$/, '') : 'repile';
  return `${base}-repiled.${EXT[format]}`;
}
