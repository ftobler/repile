import { useStoredState } from './useStoredState';

/** Minimum tile widths in CSS pixels; the grid stretches tiles to fill each row. */
export const TILE_SIZES = [
  { value: 160, label: 'Extra small' },
  { value: 200, label: 'Small' },
  { value: 240, label: 'Medium' },
  { value: 320, label: 'Large' },
  { value: 420, label: 'Extra large' },
] as const;

export const DEFAULT_TILE_SIZE = 240;

export function useTileSize() {
  return useStoredState<number>('repile-tile-size', DEFAULT_TILE_SIZE, (raw) =>
    TILE_SIZES.find((s) => String(s.value) === raw)?.value,
  );
}
