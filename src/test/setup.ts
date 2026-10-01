import '@testing-library/jest-dom/vitest';

// jsdom has no canvas implementation; return null quietly so drawing code can bail out.
HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext;
