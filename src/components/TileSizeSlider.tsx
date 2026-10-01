import { TILE_SIZE } from '../useTileSize';

export function TileSizeSlider({ value, onChange }: { value: number; onChange: (size: number) => void }) {
  return (
    <label className="tile-size" title="Tile size">
      <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="3" fill="none" stroke="currentColor" strokeWidth="2.5" />
      </svg>
      <input
        type="range"
        aria-label="Tile size"
        min={TILE_SIZE.min}
        max={TILE_SIZE.max}
        step={TILE_SIZE.step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="3" fill="none" stroke="currentColor" strokeWidth="2" />
      </svg>
    </label>
  );
}
