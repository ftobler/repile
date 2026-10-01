export type FileKind = 'pdf' | 'image';
export type ExportFormat = 'pdf' | 'png' | 'jpeg';

const IMAGE_EXT = /\.(png|jpe?g|webp|gif|bmp|avif)$/i;
const IMAGE_MIME = /^image\/(png|jpeg|webp|gif|bmp|avif)$/;

export function fileKind(file: File): FileKind | null {
  if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) return 'pdf';
  if (IMAGE_MIME.test(file.type) || (!file.type && IMAGE_EXT.test(file.name))) return 'image';
  return null;
}

const EXT: Record<ExportFormat | 'zip', string> = { pdf: 'pdf', png: 'png', jpeg: 'jpg', zip: 'zip' };

export function exportFileName(firstName: string | undefined, format: ExportFormat | 'zip', index?: number): string {
  const base = firstName ? firstName.replace(/\.[^.]+$/, '') : 'repile';
  const suffix = index === undefined ? '' : `-${index}`;
  return `${base}-repiled${suffix}.${EXT[format]}`;
}
