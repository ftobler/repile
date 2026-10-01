import { Icon } from './Icon';

export const ACCEPT = 'application/pdf,.pdf,image/png,image/jpeg,image/webp,image/gif,image/bmp,image/avif';

export function FileButton({ onFiles, label, primary }: { onFiles: (files: File[]) => void; label: string; primary?: boolean }) {
  return (
    <label className={`button ${primary ? 'primary' : 'ghost'}`}>
      <Icon name={primary ? 'upload' : 'plus'} />
      {label}
      <input
        type="file"
        multiple
        accept={ACCEPT}
        className="visually-hidden"
        aria-label="Choose files"
        onChange={(e) => {
          onFiles(Array.from(e.target.files ?? []));
          e.target.value = '';
        }}
      />
    </label>
  );
}

export function EmptyState({ onFiles }: { onFiles: (files: File[]) => void }) {
  return (
    <div className="empty">
      <div className="empty-art" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <h1>Drop PDFs or images here</h1>
      <p className="muted">Pages land in a grid where you can reorder, rotate, crop and remove them, then export as PDF, PNG or JPEG. Everything stays in your browser.</p>
      <FileButton onFiles={onFiles} label="Choose files" primary />
    </div>
  );
}
