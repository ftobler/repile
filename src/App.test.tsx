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
  await screen.findByRole('list', { name: 'Pages' });
  await waitFor(() => expect(screen.queryByText('Loading…')).not.toBeInTheDocument());
}

const tiles = () => {
  const grid = screen.queryByRole('list', { name: 'Pages' });
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

describe('tile size', () => {
  const grid = () => screen.getByRole('list', { name: 'Pages' });

  it('has a bigger default', async () => {
    const { user } = setup();
    await addFiles(user, png());
    expect(screen.getByRole('slider', { name: /tile size/i })).toHaveValue('240');
    expect(grid().style.getPropertyValue('--tile-size')).toBe('240px');
  });

  it('can be changed from the top bar and is remembered', async () => {
    const { user } = setup();
    await addFiles(user, png());
    fireEvent.change(screen.getByRole('slider', { name: /tile size/i }), { target: { value: '320' } });
    expect(grid().style.getPropertyValue('--tile-size')).toBe('320px');
    expect(localStorage.getItem('repile-tile-size')).toBe('320');
  });

  it('restores the remembered size', () => {
    localStorage.setItem('repile-tile-size', '180');
    setup();
    expect(screen.getByRole('slider', { name: /tile size/i })).toHaveValue('180');
  });

  it('ignores garbage in storage', () => {
    localStorage.setItem('repile-tile-size', 'huge');
    setup();
    expect(screen.getByRole('slider', { name: /tile size/i })).toHaveValue('240');
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
