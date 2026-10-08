import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ScoreContainer } from './production-score-container.js';

// jsdom has no layout, so fake one: the tile's content area is 210x160 (250x200
// minus the 20px border) and each glyph is ~0.75em wide, roughly MEKTON's digit
// advance (measured in Chrome: "88" at 140px is 199px).
const AVAIL_WIDTH = 210;
const AVAIL_HEIGHT = 160;
const GLYPH_EM = 0.75;
const LINE_EM = 0.97;

function fontPx(el: HTMLElement): number {
  return parseFloat(el.style.fontSize);
}

function textWidth(el: HTMLElement): number {
  return (el.textContent ?? '').length * GLYPH_EM * fontPx(el);
}

function textHeight(el: HTMLElement): number {
  return LINE_EM * fontPx(el);
}

function isTile(el: HTMLElement): boolean {
  return el.classList.contains('production-score-container');
}

function renderTile(number: string) {
  const { container } = render(<ScoreContainer number={number} label='x' />);
  const box = container.querySelector<HTMLElement>(
    '.production-score-container'
  )!;
  const text = box.firstElementChild as HTMLElement;
  return { box, text };
}

describe('ScoreContainer', () => {
  beforeEach(() => {
    const getter = (fn: (el: HTMLElement) => number) =>
      function (this: HTMLElement) {
        return fn(this);
      };
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(
      getter((el) => (isTile(el) ? AVAIL_WIDTH : 0))
    );
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockImplementation(
      getter((el) => (isTile(el) ? AVAIL_HEIGHT : 0))
    );
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(
      getter((el) => (isTile(el) ? 0 : textWidth(el)))
    );
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(
      getter((el) => (isTile(el) ? 0 : textHeight(el)))
    );
    vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(0);
    vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(0);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each(['8', '88'])('keeps the 140px base size for "%s"', (value) => {
    const { text } = renderTile(value);
    expect(text.style.fontSize).toBe('140px');
  });

  it.each(['188', '888', '1888', 'x1.25'])(
    'shrinks "%s" to fit inside the tile',
    (value) => {
      const { text } = renderTile(value);
      expect(fontPx(text)).toBeLessThan(140);
      expect(textWidth(text)).toBeLessThanOrEqual(AVAIL_WIDTH);
      expect(textHeight(text)).toBeLessThanOrEqual(AVAIL_HEIGHT);
    }
  );

  it('does not change the tile size', () => {
    const { box } = renderTile('888');
    expect(box.style.width).toBe('250px');
    expect(box.style.height).toBe('200px');
    expect(box.style.border).toBe('20px solid black');
  });

  it('grows back to the base size when the value shortens', () => {
    const { container, rerender } = render(
      <ScoreContainer number='888' label='x' />
    );
    rerender(<ScoreContainer number='8' label='x' />);
    const text = container.querySelector<HTMLElement>(
      '.production-score-container > span'
    )!;
    expect(text.style.fontSize).toBe('140px');
  });
});
