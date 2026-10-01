import { useStoredState } from './useStoredState';

export const TILE_SIZE = { min: 140, max: 480, step: 20, default: 240 } as const;

/** Minimum tile width in CSS pixels; the grid stretches tiles to fill each row. */
export function useTileSize() {
  return useStoredState<number>('repile-tile-size', TILE_SIZE.default, (raw) => {
    const n = Number(raw);
    return Number.isFinite(n) && n >= TILE_SIZE.min && n <= TILE_SIZE.max ? n : undefined;
  });
}
