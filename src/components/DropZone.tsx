import { useRef } from 'react';
import { Icon } from './Icon';

export const ACCEPT = 'application/pdf,.pdf,image/png,image/jpeg,image/webp,image/gif,image/bmp,image/avif';

interface FileButtonProps {
  onFiles: (files: File[]) => void;
  label: string;
  /** Large call-to-action with text instead of a compact icon button. */
  primary?: boolean;
}

export function FileButton({ onFiles, label, primary }: FileButtonProps) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <button
        type="button"
        className={primary ? 'button primary' : 'tool'}
        aria-label={primary ? undefined : label}
        title={primary ? undefined : label}
        onClick={() => input.current?.click()}
      >
        <Icon name={primary ? 'upload' : 'plus'} />
        {primary && label}
      </button>
      <input
        ref={input}
        type="file"
        multiple
        accept={ACCEPT}
        className="visually-hidden"
        tabIndex={-1}
        aria-label="Choose files"
        onChange={(e) => {
          onFiles(Array.from(e.target.files ?? []));
          e.target.value = '';
        }}
      />
    </>
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
      <p className="muted">Pages land in a grid where you can reorder, rotate, crop and remove them, then export them as a PDF or combine them into one PNG or JPEG collage. Everything stays in your browser.</p>
      <FileButton onFiles={onFiles} label="Choose files" primary />
    </div>
  );
}
