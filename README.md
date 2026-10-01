# Repile

Rearrange your pages. Drop PDFs or images in, then reorder, rotate, crop, duplicate or remove pages in a tile grid and export them as a PDF or as PNG/JPEG images (several images come as a `.zip`). Every edit can be undone (Ctrl/⌘+Z) and redone (Ctrl/⌘+Shift+Z or Ctrl+Y). Everything runs in the browser and nothing is uploaded.

## Development

```sh
just install   # npm install
just dev       # vite dev server
just test      # vitest
just lint
just typecheck
just build
```

## Layout

- `src/model` – pure, unit-tested logic: page reducer, crop/rotation geometry, file detection
- `src/lib` – browser side: loading files (pdf.js), rendering to canvas, export (pdf-lib, fflate)
- `src/components` – React UI

PDF pages are exported by copying the original page (vector content stays intact), with rotation and crop box applied. Images, and every page in PNG/JPEG export, are rasterized; PDF pages are rendered at 144 dpi.
