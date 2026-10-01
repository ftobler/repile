import { useCallback, useEffect, useReducer, useState, type DragEvent } from 'react';
import { CropDialog } from './components/CropDialog';
import { EmptyState, FileButton } from './components/DropZone';
import { ExportBar } from './components/ExportBar';
import { Icon } from './components/Icon';
import { PageGrid } from './components/PageGrid';
import { ThemeToggle } from './components/ThemeToggle';
import { TileSizePicker } from './components/TileSizePicker';
import type { ExportResult, SourceLookup } from './lib/export';
import type { Source } from './lib/sources';
import { fileKind, type ExportFormat } from './model/fileKind';
import { initHistory, withHistory } from './model/history';
import { initialPagesState, pagesReducer, type Page } from './model/pages';
import { useTheme } from './useTheme';
import { useTileSize } from './useTileSize';

export interface AppProps {
  loadSource?: (file: File) => Promise<Source>;
  exporter?: (pages: Page[], lookup: SourceLookup, format: ExportFormat, firstName?: string) => Promise<ExportResult>;
  download?: (result: ExportResult) => void;
}

// Loaded lazily so pdf.js / pdf-lib stay out of the initial bundle.
const defaultLoad: NonNullable<AppProps['loadSource']> = (file) => import('./lib/sources').then((m) => m.loadSource(file));
const defaultExport: NonNullable<AppProps['exporter']> = (...args) => import('./lib/export').then((m) => m.exportPages(...args));
const defaultDownload: NonNullable<AppProps['download']> = (r) => void import('./lib/export').then((m) => m.download(r));

const historyReducer = withHistory(pagesReducer);

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
const MOD = isMac ? '⌘' : 'Ctrl+';

/** Text fields keep their own undo; everything else gets the page history. */
function isTextField(el: EventTarget | null) {
  return (
    el instanceof HTMLElement &&
    (el.isContentEditable || el instanceof HTMLTextAreaElement || (el instanceof HTMLInputElement && !['range', 'radio', 'checkbox', 'file', 'button'].includes(el.type)))
  );
}

function pagesOf(source: Source): Page[] {
  const multi = source.kind === 'pdf';
  return source.pages.map((p, i) => ({
    id: crypto.randomUUID(),
    sourceId: source.id,
    pageIndex: i,
    label: multi ? `${source.name} · ${i + 1}` : source.name,
    rotation: p.initialRotation,
    crop: null,
  }));
}

export default function App({ loadSource = defaultLoad, exporter = defaultExport, download = defaultDownload }: AppProps) {
  const { theme, toggle } = useTheme();
  const [tileSize, setTileSize] = useTileSize();
  const [history, dispatch] = useReducer(historyReducer, initialPagesState, initHistory);
  const { pages } = history.present;
  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;
  const [sources, setSources] = useState<ReadonlyMap<string, Source>>(new Map());
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [format, setFormat] = useState<ExportFormat>('pdf');
  const [exporting, setExporting] = useState(false);
  const [cropping, setCropping] = useState<string | null>(null);

  const addFiles = useCallback(
    async (files: File[]) => {
      for (const file of files) {
        if (!fileKind(file)) {
          setErrors((e) => [...e, `${file.name}: not a PDF or image`]);
          continue;
        }
        setLoading((n) => n + 1);
        try {
          const source = await loadSource(file);
          setSources((m) => new Map(m).set(source.id, source));
          dispatch({ type: 'add', pages: pagesOf(source) });
        } catch (err) {
          console.error(err);
          setErrors((e) => [...e, `${file.name}: could not be read`]);
        } finally {
          setLoading((n) => n - 1);
        }
      }
    },
    [loadSource],
  );

  useEffect(() => {
    if (cropping) return;
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey || isTextField(e.target)) return;
      const key = e.key.toLowerCase();
      if (key === 'z') dispatch({ type: e.shiftKey ? 'redo' : 'undo' });
      else if (key === 'y' && !e.shiftKey) dispatch({ type: 'redo' });
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cropping]);

  const sourcePage = (page: Page) => sources.get(page.sourceId)?.pages[page.pageIndex];

  const onExport = async () => {
    setExporting(true);
    try {
      const first = sources.get(pages[0].sourceId)?.name;
      download(await exporter(pages, (id) => sources.get(id), format, first));
    } catch (err) {
      console.error(err);
      setErrors((e) => [...e, 'Export failed']);
    } finally {
      setExporting(false);
    }
  };

  const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes('Files');
  const dropHandlers = {
    onDragOver: (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      setDragging(true);
    },
    onDragLeave: (e: DragEvent) => {
      if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
    },
    onDrop: (e: DragEvent) => {
      e.preventDefault();
      setDragging(false);
      void addFiles(Array.from(e.dataTransfer?.files ?? []));
    },
  };

  const croppingPage = pages.find((p) => p.id === cropping);
  const croppingSource = croppingPage && sourcePage(croppingPage);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <svg width="22" height="22" viewBox="0 0 32 32" aria-hidden="true">
            <rect x="9" y="3" width="18" height="22" rx="3" fill="var(--accent)" opacity=".45" />
            <rect x="5" y="7" width="18" height="22" rx="3" fill="var(--accent)" />
          </svg>
          <span className="brand-name">Repile</span>
          <span className="muted brand-tag">rearrange your pages</span>
        </div>
        {(pages.length > 0 || canUndo || canRedo) && (
          <div className="tools" role="toolbar" aria-label="Page tools">
            <span className="count" title={`${pages.length} ${pages.length === 1 ? 'page' : 'pages'}`}>
              {pages.length}
            </span>
            <button type="button" className="tool" aria-label="Undo" title={`Undo (${MOD}Z)`} disabled={!canUndo} onClick={() => dispatch({ type: 'undo' })}>
              <Icon name="undo" />
            </button>
            <button type="button" className="tool" aria-label="Redo" title={`Redo (${MOD}${isMac ? '⇧Z' : 'Y'})`} disabled={!canRedo} onClick={() => dispatch({ type: 'redo' })}>
              <Icon name="redo" />
            </button>
            <span className="divider" aria-hidden="true" />
            <FileButton onFiles={addFiles} label="Add files" />
            <button type="button" className="tool" aria-label="Rotate all left" title="Rotate all left" onClick={() => dispatch({ type: 'rotateAll', by: -90 })}>
              <Icon name="rotateLeft" />
            </button>
            <button type="button" className="tool" aria-label="Rotate all right" title="Rotate all right" onClick={() => dispatch({ type: 'rotateAll', by: 90 })}>
              <Icon name="rotateRight" />
            </button>
            <button type="button" className="tool danger" aria-label="Clear all" title="Clear all" onClick={() => dispatch({ type: 'clear' })}>
              <Icon name="trash" />
            </button>
            <span className="divider" aria-hidden="true" />
            <TileSizePicker value={tileSize} onChange={setTileSize} />
            <span className="divider" aria-hidden="true" />
            <ExportBar format={format} onFormat={setFormat} onExport={onExport} busy={exporting} pageCount={pages.length} />
          </div>
        )}
        <div className="theme">
          <ThemeToggle theme={theme} onToggle={toggle} />
        </div>
      </header>

      {errors.length > 0 && (
        <div className="errors" role="alert">
          <ul>
            {errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
          <button type="button" className="button ghost" onClick={() => setErrors([])}>
            Dismiss
          </button>
        </div>
      )}

      <main className={`content${dragging ? ' drop-active' : ''}`} {...dropHandlers}>
        {pages.length === 0 ? (
          loading > 0 ? <p className="muted loading">Loading…</p> : <EmptyState onFiles={addFiles} />
        ) : (
          <PageGrid
            pages={pages}
            tileSize={tileSize}
            sourcePage={sourcePage}
            onMove={(id, overId) => dispatch({ type: 'move', id, overId })}
            onRotate={(id, by) => dispatch({ type: 'rotate', id, by })}
            onCrop={setCropping}
            onDuplicate={(id) => dispatch({ type: 'duplicate', id, newId: crypto.randomUUID() })}
            onRemove={(id) => dispatch({ type: 'remove', id })}
          />
        )}
        {loading > 0 && pages.length > 0 && <p className="muted loading">Loading…</p>}
        {dragging && <div className="drop-overlay">Drop to add pages</div>}
      </main>

      {croppingPage && croppingSource && (
        <CropDialog
          page={croppingPage}
          sourcePage={croppingSource}
          onApply={(crop) => {
            dispatch({ type: 'crop', id: croppingPage.id, crop });
            setCropping(null);
          }}
          onClose={() => setCropping(null)}
        />
      )}
    </div>
  );
}
