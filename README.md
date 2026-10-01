# Repile

Rearrange your pages. Drop PDFs or images (PNG, JPEG, WebP, GIF, BMP, AVIF, SVG) in, then reorder, rotate, crop, duplicate or remove pages in a tile grid and export them as a PDF. In PNG/JPEG mode everything is combined into one collage image instead: items are laid out in rows (pick how many per row), every item in a row is scaled to the same height and the rows are stretched to a common width; a shorter last row is centred rather than blown up. The preview shows the collage exactly as it will be exported. Every edit can be undone (Ctrl/⌘+Z) and redone (Ctrl/⌘+Shift+Z or Ctrl+Y). Everything runs in the browser and nothing is uploaded.

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

- `src/model` – pure, unit-tested logic: page reducer, crop/rotation geometry, collage layout, file detection
- `src/lib` – browser side: loading files (pdf.js), rendering to canvas, export (pdf-lib)
- `src/components` – React UI

PDF pages are exported by copying the original page (vector content stays intact), with rotation and crop box applied. Images, and every page in the PNG/JPEG collage, are rasterized; PDF pages are rendered at 144 dpi. SVGs are rasterized once on load at 2048 px on their longest side (through an `<img>`, so their scripts never run); in a PDF they keep their intrinsic size, taken from `width`/`height`, else the `viewBox`, else 1024 px.
