import { TILE_SIZES } from '../useTileSize';

export function TileSizePicker({ value, onChange }: { value: number; onChange: (size: number) => void }) {
  return (
    <label className="tile-size" title="Tile size">
      <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
        <g fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </g>
      </svg>
      <select aria-label="Tile size" value={value} onChange={(e) => onChange(Number(e.target.value))}>
        {TILE_SIZES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
    </label>
  );
}
