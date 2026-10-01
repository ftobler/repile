import { TILE_SIZE } from '../useTileSize';

export function TileSizeSlider({ value, onChange }: { value: number; onChange: (size: number) => void }) {
  return (
    <label className="tile-size" title="Tile size">
      <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4" y="4" width="16" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
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
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
        <rect x="2" y="2" width="20" height="20" rx="3" fill="none" stroke="currentColor" strokeWidth="2" />
      </svg>
    </label>
  );
}
