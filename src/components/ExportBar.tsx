import type { ExportFormat } from '../model/fileKind';
import { Icon } from './Icon';

const FORMATS: { value: ExportFormat; label: string }[] = [
  { value: 'pdf', label: 'PDF' },
  { value: 'png', label: 'PNG' },
  { value: 'jpeg', label: 'JPEG' },
];

interface Props {
  format: ExportFormat;
  onFormat: (f: ExportFormat) => void;
  onExport: () => void;
  busy: boolean;
  pageCount: number;
}

export function ExportBar({ format, onFormat, onExport, busy, pageCount }: Props) {
  const zipped = format !== 'pdf' && pageCount > 1;
  return (
    <div className="export">
      <div className="segmented" role="radiogroup" aria-label="Export format">
        {FORMATS.map((f) => (
          <label key={f.value} className={format === f.value ? 'active' : ''}>
            <input type="radio" name="format" value={f.value} checked={format === f.value} onChange={() => onFormat(f.value)} className="visually-hidden" />
            {f.label}
          </label>
        ))}
      </div>
      <button type="button" className="button primary" onClick={onExport} disabled={busy || pageCount === 0} title={zipped ? 'Images are bundled into a .zip' : undefined}>
        <Icon name="download" />
        {busy ? 'Exporting…' : zipped ? 'Export .zip' : 'Export'}
      </button>
    </div>
  );
}
