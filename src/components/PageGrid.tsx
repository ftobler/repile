import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import type { CSSProperties } from 'react';
import type { CollageLayout } from '../model/collage';
import type { Page } from '../model/pages';
import type { SourcePage } from '../lib/sources';
import { PageTile, type TileActions } from './PageTile';

interface Props extends TileActions {
  pages: Page[];
  /** Minimum tile width in CSS pixels. */
  tileSize: number;
  sourcePage: (page: Page) => SourcePage | undefined;
  onMove: (id: string, overId: string) => void;
  /** Show the pages as the exported collage (image mode) instead of a page grid. */
  collage?: { layout: CollageLayout; perRow: number };
}

const pct = (n: number, of: number) => `${of ? (n / of) * 100 : 0}%`;

export function PageGrid({ pages, tileSize, sourcePage, onMove, collage, ...actions }: Props) {
  const sensors = useSensors(
    // A small distance keeps clicks on tile buttons from starting a drag.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id) onMove(String(active.id), String(over.id));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={pages.map((p) => p.id)} strategy={rectSortingStrategy}>
        {collage ? (
          <ul
            className="collage"
            aria-label="Collage"
            style={{ '--tile-size': `${tileSize}px`, '--per-row': collage.perRow, aspectRatio: `${collage.layout.width} / ${collage.layout.height}` } as CSSProperties}
          >
            {pages.map((page, i) => {
              const box = collage.layout.items[i];
              const { width, height } = collage.layout;
              const place = box && { left: pct(box.x, width), top: pct(box.y, height), width: pct(box.width, width), height: pct(box.height, height) };
              return <PageTile key={page.id} page={page} index={i} sourcePage={sourcePage(page)} place={place} {...actions} />;
            })}
          </ul>
        ) : (
          <ul className="grid" aria-label="Pages" style={{ '--tile-size': `${tileSize}px` } as CSSProperties}>
            {pages.map((page, i) => (
              <PageTile key={page.id} page={page} index={i} sourcePage={sourcePage(page)} {...actions} />
            ))}
          </ul>
        )}
      </SortableContext>
    </DndContext>
  );
}
