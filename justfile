

build:
    npm run build


# Build with base / and zip it into dist/repile-static.zip (self-hosting download)
static-zip: build
    #!/usr/bin/env bash
    set -euo pipefail
    tmp=$(mktemp -d)
    trap 'rm -rf "$tmp"' EXIT
    VITE_BASE=/ npx vite build --outDir "$tmp/repile-static" --emptyOutDir
    cp "$tmp/repile-static/index.html" "$tmp/repile-static/404.html"
    out="$PWD/dist/repile-static.zip"
    cd "$tmp" && python3 -m zipfile -c "$out" repile-static/


dev:
    npm run dev


test:
    npm run test


typecheck:
    npm run typecheck


lint:
    npm run lint


install:
    npm install