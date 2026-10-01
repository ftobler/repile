import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App, { type AppProps } from './App';
import type { Source } from './lib/sources';

function fakeSource(file: File, pageCount = 1): Source {
  const bitmap = { image: document.createElement('canvas'), width: 100, height: 200 };
  return {
    id: crypto.randomUUID(),
    name: file.name,
    kind: file.type === 'application/pdf' ? 'pdf' : 'image',
    mime: file.type,
    bytes: new ArrayBuffer(0),
    pages: Array.from({ length: pageCount }, () => ({
      width: 100,
      height: 200,
      initialRotation: 0 as const,
      preview: () => Promise.resolve(bitmap),
      render: () => Promise.resolve(bitmap),
    })),
  };
}

const pdf = (name = 'doc.pdf') => new File(['%PDF'], name, { type: 'application/pdf' });
const png = (name = 'pic.png') => new File(['png'], name, { type: 'image/png' });

function setup(props: Partial<AppProps> = {}) {
  const loadSource = vi.fn(async (f: File) => fakeSource(f, f.type === 'application/pdf' ? 3 : 1));
  const exporter = vi.fn(async () => ({ blob: new Blob(['x']), fileName: 'out.pdf' }));
  const download = vi.fn();
  const user = userEvent.setup();
  render(<App loadSource={loadSource} exporter={exporter} download={download} {...props} />);
  return { user, loadSource, exporter, download };
}

async function addFiles(user: ReturnType<typeof userEvent.setup>, ...files: File[]) {
  await user.upload(screen.getByLabelText(/choose files/i), files);
  await screen.findByRole('list', { name: /^(pages|collage)$/i });
  await waitFor(() => expect(screen.queryByText('Loading…')).not.toBeInTheDocument());
}

const tiles = () => {
  const grid = screen.queryByRole('list', { name: /^(pages|collage)$/i });
  return grid ? within(grid).queryAllByRole('listitem') : [];
};
const tileLabels = () => tiles().map((t) => within(t).getByTestId('tile-label').textContent);

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
});

describe('theme', () => {
  it('starts in dark mode', () => {
    setup();
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('toggles to light mode and remembers the choice', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: /switch to light mode/i }));
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(localStorage.getItem('repile-theme')).toBe('light');
    expect(screen.getByRole('button', { name: /switch to dark mode/i })).toBeInTheDocument();
  });
});

describe('layout', () => {
  it('keeps all page tools in one floating toolbar, separate from the theme toggle', async () => {
    const { user } = setup();
    await addFiles(user, png());
    const tools = screen.getByRole('toolbar', { name: /page tools/i });
    for (const name of [/add files/i, /rotate all left/i, /rotate all right/i, /clear all/i, /^export/i]) {
      expect(within(tools).getByRole('button', { name })).toBeInTheDocument();
    }
    expect(within(tools).getByRole('combobox', { name: /tile size/i })).toBeInTheDocument();
    expect(within(tools).queryByRole('button', { name: /switch to/i })).not.toBeInTheDocument();
  });

  it('hides the toolbar until there are pages', () => {
    setup();
    expect(screen.queryByRole('toolbar')).not.toBeInTheDocument();
  });
});

describe('tile size', () => {
  const grid = () => screen.getByRole('list', { name: 'Pages' });
  const sizePicker = () => screen.getByRole('combobox', { name: /tile size/i });

  it('offers five sizes and defaults to medium', async () => {
    const { user } = setup();
    await addFiles(user, png());
    expect(within(sizePicker()).getAllByRole('option').map((o) => o.textContent)).toEqual([
      'Extra small',
      'Small',
      'Medium',
      'Large',
      'Extra large',
    ]);
    expect(sizePicker()).toHaveDisplayValue('Medium');
    expect(grid().style.getPropertyValue('--tile-size')).toBe('240px');
  });

  it('can be changed from the toolbar and is remembered', async () => {
    const { user } = setup();
    await addFiles(user, png());
    await user.selectOptions(sizePicker(), 'Large');
    expect(grid().style.getPropertyValue('--tile-size')).toBe('320px');
    expect(localStorage.getItem('repile-tile-size')).toBe('320');
  });

  it('restores the remembered size', async () => {
    localStorage.setItem('repile-tile-size', '160');
    const { user } = setup();
    await addFiles(user, png());
    expect(sizePicker()).toHaveDisplayValue('Extra small');
  });

  it('falls back to medium for sizes that are not offered', async () => {
    localStorage.setItem('repile-tile-size', '180');
    const { user } = setup();
    await addFiles(user, png());
    expect(sizePicker()).toHaveDisplayValue('Medium');
  });
});

describe('loading files', () => {
  it('shows a drop zone while empty', () => {
    setup();
    expect(screen.getByText(/drop pdfs or images/i)).toBeInTheDocument();
    expect(tiles()).toHaveLength(0);
  });

  it('turns every pdf page and image into a tile', async () => {
    const { user } = setup();
    await addFiles(user, pdf(), png());
    expect(tileLabels()).toEqual(['doc.pdf · 1', 'doc.pdf · 2', 'doc.pdf · 3', 'pic.png']);
  });

  it('accepts dropped files', async () => {
    setup();
    const main = screen.getByRole('main');
    fireEvent.drop(main, { dataTransfer: { files: [png()], types: ['Files'] } });
    await waitFor(() => expect(tiles()).toHaveLength(1));
  });

  it('reports unsupported files and keeps going', async () => {
    setup();
    fireEvent.change(screen.getByLabelText(/choose files/i), {
      target: { files: [new File(['x'], 'notes.txt', { type: 'text/plain' }), png()] },
    });
    expect(await screen.findByRole('alert')).toHaveTextContent(/notes\.txt/);
    await waitFor(() => expect(tiles()).toHaveLength(1));
  });

  it('reports files that fail to load', async () => {
    const { user } = setup({ loadSource: vi.fn().mockRejectedValue(new Error('broken')) });
    await user.upload(screen.getByLabelText(/choose files/i), [pdf('bad.pdf')]);
    expect(await screen.findByRole('alert')).toHaveTextContent(/bad\.pdf/);
  });
});

describe('editing tiles', () => {
  it('rotates a page', async () => {
    const { user } = setup();
    await addFiles(user, png());
    const tile = tiles()[0];
    await user.click(within(tile).getByRole('button', { name: /rotate right/i }));
    expect(tile).toHaveAttribute('data-rotation', '90');
    await user.click(within(tile).getByRole('button', { name: /rotate left/i }));
    await user.click(within(tile).getByRole('button', { name: /rotate left/i }));
    expect(tile).toHaveAttribute('data-rotation', '270');
  });

  it('removes a page', async () => {
    const { user } = setup();
    await addFiles(user, pdf());
    await user.click(within(tiles()[1]).getByRole('button', { name: /remove/i }));
    expect(tileLabels()).toEqual(['doc.pdf · 1', 'doc.pdf · 3']);
  });

  it('duplicates a page', async () => {
    const { user } = setup();
    await addFiles(user, png());
    await user.click(within(tiles()[0]).getByRole('button', { name: /duplicate/i }));
    expect(tiles()).toHaveLength(2);
  });

  it('opens the crop editor and resets a crop', async () => {
    const { user } = setup();
    await addFiles(user, png());
    await user.click(within(tiles()[0]).getByRole('button', { name: /crop/i }));
    const dialog = screen.getByRole('dialog', { name: /crop/i });
    await user.click(within(dialog).getByRole('button', { name: /cancel/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('clears all pages', async () => {
    const { user } = setup();
    await addFiles(user, pdf());
    await user.click(screen.getByRole('button', { name: /clear all/i }));
    expect(tiles()).toHaveLength(0);
  });
});

describe('undo / redo', () => {
  const undo = () => screen.getByRole('button', { name: /^undo/i });
  const redo = () => screen.getByRole('button', { name: /^redo/i });

  it('undoes and redoes edits from the toolbar', async () => {
    const { user } = setup();
    await addFiles(user, pdf());
    expect(redo()).toBeDisabled();
    await user.click(within(tiles()[0]).getByRole('button', { name: /rotate right/i }));
    await user.click(within(tiles()[1]).getByRole('button', { name: /remove/i }));
    expect(tileLabels()).toEqual(['doc.pdf · 1', 'doc.pdf · 3']);

    await user.click(undo());
    expect(tileLabels()).toEqual(['doc.pdf · 1', 'doc.pdf · 2', 'doc.pdf · 3']);
    await user.click(undo());
    expect(tiles()[0]).toHaveAttribute('data-rotation', '0');

    await user.click(redo());
    expect(tiles()[0]).toHaveAttribute('data-rotation', '90');
  });

  it('can bring pages back after clearing everything', async () => {
    const { user } = setup();
    await addFiles(user, pdf());
    await user.click(screen.getByRole('button', { name: /clear all/i }));
    expect(tiles()).toHaveLength(0);
    await user.click(undo());
    expect(tiles()).toHaveLength(3);
  });

  it('supports keyboard shortcuts', async () => {
    const { user } = setup();
    await addFiles(user, png());
    await user.click(within(tiles()[0]).getByRole('button', { name: /duplicate/i }));
    expect(tiles()).toHaveLength(2);

    await user.keyboard('{Control>}z{/Control}');
    expect(tiles()).toHaveLength(1);
    await user.keyboard('{Control>}{Shift>}z{/Shift}{/Control}');
    expect(tiles()).toHaveLength(2);
    await user.keyboard('{Meta>}z{/Meta}');
    expect(tiles()).toHaveLength(1);
    await user.keyboard('{Control>}y{/Control}');
    expect(tiles()).toHaveLength(2);
  });

  it('starts without anything to undo', () => {
    setup();
    expect(screen.queryByRole('button', { name: /^undo/i })).not.toBeInTheDocument();
  });
});

describe('image mode', () => {
  const perRow = () => screen.getByRole('combobox', { name: /per row/i });
  const collage = () => screen.getByRole('list', { name: 'Collage' });

  it('shows pages as a grid in pdf mode and as a collage in image mode', async () => {
    const { user } = setup();
    await addFiles(user, pdf(), png());
    expect(screen.getByRole('list', { name: 'Pages' })).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: /per row/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: 'PNG' }));
    expect(screen.queryByRole('list', { name: 'Pages' })).not.toBeInTheDocument();
    expect(within(collage()).getAllByRole('listitem')).toHaveLength(4);
    expect(perRow()).toHaveDisplayValue('3 per row');
  });

  it('lays items out in rows of equal height', async () => {
    const { user } = setup();
    await addFiles(user, png('a.png'), png('b.png'), png('c.png'), png('d.png'));
    await user.click(screen.getByRole('radio', { name: 'JPEG' }));
    await user.selectOptions(perRow(), '2 per row');
    // four 100x200 images, two per row: a 200x400 collage, each item a quarter
    expect(collage().style.aspectRatio).toBe('200 / 400');
    const boxes = tiles().map((t) => [t.style.left, t.style.top, t.style.width, t.style.height]);
    expect(boxes).toEqual([
      ['0%', '0%', '50%', '50%'],
      ['50%', '0%', '50%', '50%'],
      ['0%', '50%', '50%', '50%'],
      ['50%', '50%', '50%', '50%'],
    ]);
  });

  it('can undo a change of the row size', async () => {
    const { user } = setup();
    await addFiles(user, png());
    await user.click(screen.getByRole('radio', { name: 'PNG' }));
    await user.selectOptions(perRow(), '5 per row');
    expect(perRow()).toHaveDisplayValue('5 per row');
    await user.click(screen.getByRole('button', { name: /^undo/i }));
    expect(perRow()).toHaveDisplayValue('3 per row');
    expect(tiles()).toHaveLength(1);
  });

  it('exports a single image with the chosen row size', async () => {
    const { user, exporter } = setup();
    await addFiles(user, png(), png());
    await user.click(screen.getByRole('radio', { name: 'PNG' }));
    await user.selectOptions(perRow(), '2 per row');
    const exportButton = screen.getByRole('button', { name: /^export/i });
    expect(exportButton).toHaveTextContent(/^Export$/);
    await act(() => user.click(exportButton));
    await waitFor(() => expect(exporter).toHaveBeenCalled());
    const args = exporter.mock.calls[0] as unknown as unknown[];
    expect(args[2]).toBe('png');
    expect(args[4]).toBe(2);
  });
});

describe('export', () => {
  it('exports pages in grid order in the chosen format', async () => {
    const { user, exporter, download } = setup();
    await addFiles(user, pdf('scan.pdf'));
    await user.click(within(tiles()[0]).getByRole('button', { name: /remove/i }));
    await user.click(screen.getByRole('radio', { name: 'JPEG' }));
    await act(() => user.click(screen.getByRole('button', { name: /^export/i })));

    await waitFor(() => expect(download).toHaveBeenCalled());
    const [pages, , format, firstName] = exporter.mock.calls[0] as unknown as [{ pageIndex: number }[], unknown, string, string];
    expect(pages.map((p) => p.pageIndex)).toEqual([1, 2]);
    expect(format).toBe('jpeg');
    expect(firstName).toBe('scan.pdf');
  });

  it('defaults to pdf export', async () => {
    const { user } = setup();
    await addFiles(user, png());
    expect(screen.getByRole('radio', { name: 'PDF' })).toBeChecked();
  });
});
