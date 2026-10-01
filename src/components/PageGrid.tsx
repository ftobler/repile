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
import type { Page } from '../model/pages';
import type { SourcePage } from '../lib/sources';
import { PageTile, type TileActions } from './PageTile';

interface Props extends TileActions {
  pages: Page[];
  /** Minimum tile width in CSS pixels. */
  tileSize: number;
  sourcePage: (page: Page) => SourcePage | undefined;
  onMove: (id: string, overId: string) => void;
}

export function PageGrid({ pages, tileSize, sourcePage, onMove, ...actions }: Props) {
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
        <ul className="grid" aria-label="Pages" style={{ '--tile-size': `${tileSize}px` } as CSSProperties}>
          {pages.map((page, i) => (
            <PageTile key={page.id} page={page} index={i} sourcePage={sourcePage(page)} {...actions} />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
