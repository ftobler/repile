import { useEffect, useRef } from 'react';
import { outputSize, type Rect, type Rotation } from '../model/geometry';
import { drawPage } from '../lib/render';
import type { SourcePage } from '../lib/sources';

interface Props {
  page: SourcePage;
  rotation: Rotation;
  crop: Rect | null;
  maxSize?: number;
  className?: string;
}

/** Canvas preview of a source page with crop and rotation applied. */
export function PageThumb({ page, rotation, crop, maxSize = 360, className }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;
    page.preview().then((bitmap) => {
      if (cancelled || !ref.current) return;
      drawPage(bitmap, { rotation, crop, maxSize: maxSize * (window.devicePixelRatio || 1) }, ref.current);
    });
    return () => {
      cancelled = true;
    };
  }, [page, rotation, crop, maxSize]);

  const { width, height } = outputSize(page.width, page.height, rotation, crop);
  return <canvas ref={ref} className={className} style={{ aspectRatio: `${width} / ${height}` }} />;
}
