import { clampRect, type Rect } from './geometry';

export type Point = [number, number];
export type Corner = 'nw' | 'ne' | 'sw' | 'se';

export type CropDrag =
  | { mode: 'draw'; start: Point }
  | { mode: 'move'; start: Point; rect: Rect }
  | { mode: 'resize'; corner: Corner; start: Point; rect: Rect };

/** Rect resulting from dragging (in unit coordinates) from `drag.start` to `to`. */
export function dragCrop(drag: CropDrag, [px, py]: Point): Rect {
  const [sx, sy] = drag.start;
  switch (drag.mode) {
    case 'draw':
      return clampRect({ x: sx, y: sy, w: px - sx, h: py - sy });
    case 'move': {
      const { rect } = drag;
      const x = Math.min(1 - rect.w, Math.max(0, rect.x + px - sx));
      const y = Math.min(1 - rect.h, Math.max(0, rect.y + py - sy));
      return { ...rect, x, y };
    }
    case 'resize': {
      const { rect, corner } = drag;
      const dx = px - sx;
      const dy = py - sy;
      let x0 = rect.x;
      let y0 = rect.y;
      let x1 = rect.x + rect.w;
      let y1 = rect.y + rect.h;
      if (corner[1] === 'w') x0 += dx;
      else x1 += dx;
      if (corner[0] === 'n') y0 += dy;
      else y1 += dy;
      return clampRect({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
    }
  }
}
