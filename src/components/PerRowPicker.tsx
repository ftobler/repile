import { PER_ROW_OPTIONS } from '../model/collage';

export function PerRowPicker({ value, onChange }: { value: number; onChange: (perRow: number) => void }) {
  return (
    <label className="picker" title="Items per collage row">
      <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
        <g fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="10" height="7" rx="1.5" />
          <rect x="16" y="4" width="5" height="7" rx="1.5" />
          <rect x="3" y="14" width="6" height="7" rx="1.5" />
          <rect x="12" y="14" width="9" height="7" rx="1.5" />
        </g>
      </svg>
      <select aria-label="Items per row" value={value} onChange={(e) => onChange(Number(e.target.value))}>
        {PER_ROW_OPTIONS.map((n) => (
          <option key={n} value={n}>
            {n} per row
          </option>
        ))}
      </select>
    </label>
  );
}
