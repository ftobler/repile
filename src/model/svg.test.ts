import { DEFAULT_SVG_SIZE, SVG_RASTER_SIZE, parseSvgLength, prepareSvg, svgIntrinsicSize, svgRasterSize } from './svg';

const parse = (markup: string) => new DOMParser().parseFromString(markup, 'image/svg+xml').documentElement;

describe('parseSvgLength', () => {
  it('reads unitless and px lengths as css pixels', () => {
    expect(parseSvgLength('120')).toBe(120);
    expect(parseSvgLength(' 120.5px ')).toBe(120.5);
    expect(parseSvgLength('1e2')).toBe(100);
  });

  it('converts absolute units to css pixels', () => {
    expect(parseSvgLength('1in')).toBe(96);
    expect(parseSvgLength('72pt')).toBe(96);
    expect(parseSvgLength('6pc')).toBe(96);
    expect(parseSvgLength('2.54cm')).toBeCloseTo(96);
    expect(parseSvgLength('25.4mm')).toBeCloseTo(96);
    expect(parseSvgLength('2em')).toBe(32);
  });

  it('ignores missing, relative, invalid and non-positive lengths', () => {
    expect(parseSvgLength(null)).toBeNull();
    expect(parseSvgLength(undefined)).toBeNull();
    expect(parseSvgLength('')).toBeNull();
    expect(parseSvgLength('100%')).toBeNull();
    expect(parseSvgLength('auto')).toBeNull();
    expect(parseSvgLength('0')).toBeNull();
    expect(parseSvgLength('-5px')).toBeNull();
  });
});

describe('svgIntrinsicSize', () => {
  it('uses width and height', () => {
    expect(svgIntrinsicSize({ width: '300', height: '150px', viewBox: '0 0 10 10' })).toEqual({ width: 300, height: 150 });
  });

  it('uses the viewBox when width and height are missing', () => {
    expect(svgIntrinsicSize({ viewBox: '0 0 24 12' })).toEqual({ width: 24, height: 12 });
    expect(svgIntrinsicSize({ viewBox: '-5,-5, 40 ,20' })).toEqual({ width: 40, height: 20 });
  });

  it('derives the missing side from the viewBox aspect ratio', () => {
    expect(svgIntrinsicSize({ width: '200', viewBox: '0 0 40 20' })).toEqual({ width: 200, height: 100 });
    expect(svgIntrinsicSize({ height: '1in', viewBox: '0 0 40 20' })).toEqual({ width: 192, height: 96 });
  });

  it('falls back to a default square when nothing usable is given', () => {
    const square = { width: DEFAULT_SVG_SIZE, height: DEFAULT_SVG_SIZE };
    expect(svgIntrinsicSize({})).toEqual(square);
    expect(svgIntrinsicSize({ width: '100%', height: '100%' })).toEqual(square);
    expect(svgIntrinsicSize({ viewBox: '0 0 0 10' })).toEqual(square);
    expect(svgIntrinsicSize({ viewBox: 'nonsense' })).toEqual(square);
  });

  it('makes a square from the one known side when there is no viewBox', () => {
    expect(svgIntrinsicSize({ width: '300' })).toEqual({ width: 300, height: 300 });
  });
});

describe('svgRasterSize', () => {
  it('scales the longest side to the raster size, keeping the aspect ratio', () => {
    expect(svgRasterSize({ width: 24, height: 12 })).toEqual({ width: SVG_RASTER_SIZE, height: SVG_RASTER_SIZE / 2 });
    expect(svgRasterSize({ width: 3000, height: 6000 })).toEqual({ width: SVG_RASTER_SIZE / 2, height: SVG_RASTER_SIZE });
    expect(svgRasterSize({ width: 3000, height: 1 }, 600)).toEqual({ width: 600, height: 1 });
  });
});

describe('prepareSvg', () => {
  it('reports the intrinsic size and pins the root to the raster size', () => {
    const svg = prepareSvg(
      '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100" viewBox="0 0 20 10"><rect width="20" height="10"/></svg>',
    );
    expect(svg.intrinsic).toEqual({ width: 200, height: 100 });
    expect(svg.raster).toEqual({ width: SVG_RASTER_SIZE, height: SVG_RASTER_SIZE / 2 });
    const root = parse(svg.markup);
    expect(root.getAttribute('width')).toBe(String(SVG_RASTER_SIZE));
    expect(root.getAttribute('height')).toBe(String(SVG_RASTER_SIZE / 2));
    expect(root.getAttribute('viewBox')).toBe('0 0 20 10');
    expect(root.querySelector('rect')).not.toBeNull();
  });

  it('adds a viewBox matching width and height so the drawing scales', () => {
    const root = parse(prepareSvg('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="10px"/>').markup);
    expect(root.getAttribute('viewBox')).toBe('0 0 20 10');
  });

  it('adds a default viewBox when the svg has no size at all', () => {
    const svg = prepareSvg('<svg xmlns="http://www.w3.org/2000/svg"/>');
    expect(svg.intrinsic).toEqual({ width: DEFAULT_SVG_SIZE, height: DEFAULT_SVG_SIZE });
    expect(parse(svg.markup).getAttribute('viewBox')).toBe(`0 0 ${DEFAULT_SVG_SIZE} ${DEFAULT_SVG_SIZE}`);
  });

  it('rejects malformed markup and non-svg documents', () => {
    expect(() => prepareSvg('<svg xmlns="http://www.w3.org/2000/svg"><g></svg>')).toThrow(/svg/i);
    expect(() => prepareSvg('not xml at all')).toThrow(/svg/i);
    expect(() => prepareSvg('<html xmlns="http://www.w3.org/1999/xhtml"/>')).toThrow(/svg/i);
  });
});
