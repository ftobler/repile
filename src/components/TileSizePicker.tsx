import { TILE_SIZES } from '../useTileSize';
import { Picker } from './Picker';

export function TileSizePicker({ value, onChange }: { value: number; onChange: (size: number) => void }) {
  return (
    <Picker
      label="Tile size"
      title="Tile size"
      value={value}
      options={TILE_SIZES}
      onChange={onChange}
      icon={
        <svg width="16" height="16" viewBox="0 0 24 24">
          <g fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" />
            <rect x="14" y="14" width="7" height="7" rx="1.5" />
          </g>
        </svg>
      }
    />
  );
}
