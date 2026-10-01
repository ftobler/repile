import { PER_ROW_OPTIONS } from '../model/collage';
import { Picker } from './Picker';

const OPTIONS = PER_ROW_OPTIONS.map((n) => ({ value: n, label: `${n} per row` }));

export function PerRowPicker({ value, onChange }: { value: number; onChange: (perRow: number) => void }) {
  return (
    <Picker
      label="Items per row"
      title="Items per collage row"
      value={value}
      options={OPTIONS}
      onChange={onChange}
      icon={
        <svg width="16" height="16" viewBox="0 0 24 24">
          <g fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="10" height="7" rx="1.5" />
            <rect x="16" y="4" width="5" height="7" rx="1.5" />
            <rect x="3" y="14" width="6" height="7" rx="1.5" />
            <rect x="12" y="14" width="9" height="7" rx="1.5" />
          </g>
        </svg>
      }
    />
  );
}
