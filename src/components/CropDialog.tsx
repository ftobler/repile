import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { dragCrop, type Corner, type CropDrag, type Point } from '../model/cropDrag';
import { displayRectToSource, sourceRectToDisplay, type Rect } from '../model/geometry';
import type { Page } from '../model/pages';
import type { SourcePage } from '../lib/sources';
import { PageThumb } from './PageThumb';

interface Props {
  page: Page;
  sourcePage: SourcePage;
  onApply: (crop: Rect | null) => void;
  onClose: () => void;
}

const FULL: Rect = { x: 0, y: 0, w: 1, h: 1 };
const CORNERS: Corner[] = ['nw', 'ne', 'sw', 'se'];
const pct = (n: number) => `${n * 100}%`;

/** Crops smaller than this (in either direction) are treated as accidental clicks. */
const MIN_SIZE = 0.02;

function isFull(r: Rect) {
  return r.x <= 0.001 && r.y <= 0.001 && r.w >= 0.999 && r.h >= 0.999;
}

export function CropDialog({ page, sourcePage, onApply, onClose }: Props) {
  const stage = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<Rect>(() => (page.crop ? sourceRectToDisplay(page.crop, page.rotation) : FULL));
  const [drag, setDrag] = useState<CropDrag | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const point = (e: ReactPointerEvent): Point => {
    const box = stage.current!.getBoundingClientRect();
    return [(e.clientX - box.left) / (box.width || 1), (e.clientY - box.top) / (box.height || 1)];
  };

  const begin = (e: ReactPointerEvent, next: (p: Point) => CropDrag) => {
    e.preventDefault();
    e.stopPropagation();
    stage.current?.setPointerCapture?.(e.pointerId);
    setDrag(next(point(e)));
  };

  const apply = () => {
    if (isFull(rect) || rect.w < MIN_SIZE || rect.h < MIN_SIZE) onApply(null);
    else onApply(displayRectToSource(rect, page.rotation));
  };

  return (
    <div className="modal-backdrop" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="crop-title">
        <header className="modal-header">
          <h2 id="crop-title">Crop page</h2>
          <span className="muted">Drag to select the area to keep</span>
        </header>
        <div className="crop-area">
          <div
            ref={stage}
            className="crop-stage"
            onPointerDown={(e) => begin(e, (start) => ({ mode: 'draw', start }))}
            onPointerMove={(e) => drag && setRect(dragCrop(drag, point(e)))}
            onPointerUp={() => setDrag(null)}
            onPointerCancel={() => setDrag(null)}
          >
            <PageThumb page={sourcePage} rotation={page.rotation} crop={null} maxSize={720} className="crop-canvas" />
            <div
              className="crop-rect"
              style={{ left: pct(rect.x), top: pct(rect.y), width: pct(rect.w), height: pct(rect.h) }}
              onPointerDown={(e) => begin(e, (start) => (isFull(rect) ? { mode: 'draw', start } : { mode: 'move', start, rect }))}
            >
              {CORNERS.map((corner) => (
                <span
                  key={corner}
                  className={`crop-handle ${corner}`}
                  onPointerDown={(e) => begin(e, (start) => ({ mode: 'resize', corner, start, rect }))}
                />
              ))}
            </div>
          </div>
        </div>
        <footer className="modal-footer">
          <button type="button" className="button ghost" onClick={() => setRect(FULL)}>
            Reset
          </button>
          <span className="spacer" />
          <button type="button" className="button ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="button primary" onClick={apply}>
            Apply
          </button>
        </footer>
      </div>
    </div>
  );
}
