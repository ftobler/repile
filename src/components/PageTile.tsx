import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Page } from '../model/pages';
import type { SourcePage } from '../lib/sources';
import { Icon, type IconName } from './Icon';
import { PageThumb } from './PageThumb';

export interface TileActions {
  onRotate: (id: string, by: number) => void;
  onCrop: (id: string) => void;
  onDuplicate: (id: string) => void;
  onRemove: (id: string) => void;
}

interface Props extends TileActions {
  page: Page;
  index: number;
  sourcePage: SourcePage | undefined;
}

function Action({ icon, label, onClick, danger }: { icon: IconName; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button type="button" className={`tile-action${danger ? ' danger' : ''}`} aria-label={label} title={label} onClick={onClick}>
      <Icon name={icon} size={16} />
    </button>
  );
}

export function PageTile({ page, index, sourcePage, onRotate, onCrop, onDuplicate, onRemove }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: page.id });

  return (
    <li
      ref={setNodeRef}
      className={`tile${isDragging ? ' dragging' : ''}`}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      data-rotation={page.rotation}
      {...attributes}
      {...listeners}
      role="listitem"
      aria-roledescription="sortable page"
    >
      <div className="tile-thumb">
        {sourcePage && <PageThumb page={sourcePage} rotation={page.rotation} crop={page.crop} />}
        {page.crop && <span className="tile-badge">cropped</span>}
      </div>
      <div className="tile-footer">
        <span className="tile-index">{index + 1}</span>
        <span className="tile-label" data-testid="tile-label" title={page.label}>
          {page.label}
        </span>
      </div>
      <div className="tile-actions" onPointerDown={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
        <Action icon="rotateLeft" label="Rotate left" onClick={() => onRotate(page.id, -90)} />
        <Action icon="rotateRight" label="Rotate right" onClick={() => onRotate(page.id, 90)} />
        <Action icon="crop" label="Crop" onClick={() => onCrop(page.id)} />
        <Action icon="copy" label="Duplicate" onClick={() => onDuplicate(page.id)} />
        <Action icon="trash" label="Remove" onClick={() => onRemove(page.id)} danger />
      </div>
    </li>
  );
}
