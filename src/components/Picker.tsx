import type { ReactNode } from 'react';

interface Option {
  value: number;
  label: string;
}

interface Props {
  label: string;
  title: string;
  icon: ReactNode;
  value: number;
  options: readonly Option[];
  onChange: (value: number) => void;
}

/** A native <select> restyled to sit in the toolbar: leading icon, themed chevron. */
export function Picker({ label, title, icon, value, options, onChange }: Props) {
  return (
    <label className="picker" title={title}>
      <span className="picker-icon" aria-hidden="true">
        {icon}
      </span>
      <select className="picker-select" aria-label={label} value={value} onChange={(e) => onChange(Number(e.target.value))}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <svg className="picker-chevron" width="10" height="6" viewBox="0 0 10 6" aria-hidden="true">
        <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </label>
  );
}
