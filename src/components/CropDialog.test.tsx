import { fireEvent, render, screen } from '@testing-library/react';
import { CropDialog } from './CropDialog';
import type { SourcePage } from '../lib/sources';
import type { Page } from '../model/pages';

const bitmap = { image: document.createElement('canvas'), width: 100, height: 200 };
const sourcePage: SourcePage = {
  width: 100,
  height: 200,
  initialRotation: 0,
  preview: () => Promise.resolve(bitmap),
  render: () => Promise.resolve(bitmap),
};
const page: Page = { id: 'p1', sourceId: 's1', pageIndex: 0, label: 'a', rotation: 0, crop: null };

it('draws a new crop by dragging the selection on first open', () => {
  const onApply = vi.fn();
  render(<CropDialog page={page} sourcePage={sourcePage} onApply={onApply} onClose={() => {}} />);

  const rect = document.querySelector('.crop-rect')!;
  fireEvent.pointerDown(rect, { clientX: 0.1, clientY: 0.1, pointerId: 1 });
  fireEvent.pointerMove(rect, { clientX: 0.6, clientY: 0.8, pointerId: 1 });
  fireEvent.pointerUp(rect, { clientX: 0.6, clientY: 0.8, pointerId: 1 });
  fireEvent.click(screen.getByRole('button', { name: /apply/i }));

  const crop = onApply.mock.calls[0][0];
  expect(crop).not.toBeNull();
  expect(crop.x).toBeCloseTo(0.1);
  expect(crop.y).toBeCloseTo(0.1);
  expect(crop.w).toBeCloseTo(0.5);
  expect(crop.h).toBeCloseTo(0.7);
});

it('applies no crop when the selection is left untouched', () => {
  const onApply = vi.fn();
  render(<CropDialog page={page} sourcePage={sourcePage} onApply={onApply} onClose={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: /apply/i }));
  expect(onApply).toHaveBeenCalledWith(null);
});
