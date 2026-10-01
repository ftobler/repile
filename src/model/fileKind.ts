export type FileKind = 'pdf' | 'image';
export type ExportFormat = 'pdf' | 'png' | 'jpeg';

const IMAGE_EXT = /\.(png|jpe?g|webp|gif|bmp|avif)$/i;
const IMAGE_MIME = /^image\/(png|jpeg|webp|gif|bmp|avif)$/;

export function fileKind(file: File): FileKind | null {
  if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) return 'pdf';
  if (IMAGE_MIME.test(file.type) || (!file.type && IMAGE_EXT.test(file.name))) return 'image';
  return null;
}

const EXT: Record<ExportFormat, string> = { pdf: 'pdf', png: 'png', jpeg: 'jpg' };

export function exportFileName(firstName: string | undefined, format: ExportFormat): string {
  const base = firstName ? firstName.replace(/\.[^.]+$/, '') : 'repile';
  return `${base}-repiled.${EXT[format]}`;
}
