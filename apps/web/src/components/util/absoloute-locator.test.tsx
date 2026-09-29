import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import AbsolouteLocator from './absoloute-locator.js';

/** The four inset values as the DOM actually reports them. */
function insets(container: HTMLElement) {
  const box = container.firstElementChild as HTMLElement;
  return {
    position: box.style.position,
    overflow: box.style.overflow,
    top: box.style.top,
    left: box.style.left,
    right: box.style.right,
    bottom: box.style.bottom
  };
}

describe('AbsolouteLocator', () => {
  it('is unsized by default - shrink-to-fit, no insets', () => {
    // Pinned on purpose. This default is what collapsed the audience display
    // to 0x0 once its children became percentage-sized, so if anyone ever
    // decides to make "no props" mean `inset: 0`, they should have to change
    // this assertion deliberately rather than discover it at an event.
    const { container } = render(
      <AbsolouteLocator>
        <span />
      </AbsolouteLocator>
    );
    expect(insets(container)).toEqual({
      position: 'absolute',
      overflow: 'hidden',
      top: '',
      left: '',
      right: '',
      bottom: ''
    });
  });

  it('fill pins all four edges', () => {
    const { container } = render(
      <AbsolouteLocator fill>
        <span />
      </AbsolouteLocator>
    );
    expect(insets(container)).toMatchObject({
      top: '0px',
      left: '0px',
      right: '0px',
      bottom: '0px'
    });
  });

  it('lets an explicit edge win over fill', () => {
    const { container } = render(
      <AbsolouteLocator fill top={16}>
        <span />
      </AbsolouteLocator>
    );
    expect(insets(container)).toMatchObject({
      top: '16px',
      left: '0px',
      right: '0px',
      bottom: '0px'
    });
  });

  it('fill is equivalent to spelling out all four edges', () => {
    // The stats graphics display spells them out (`stats-graphic-display.tsx`).
    // It is deliberately NOT migrated to `fill`, so this is the guard that the
    // two forms stay interchangeable and that adding `fill` changed nothing
    // for the stats path.
    const explicit = render(
      <AbsolouteLocator top={0} left={0} right={0} bottom={0}>
        <span />
      </AbsolouteLocator>
    );
    const filled = render(
      <AbsolouteLocator fill>
        <span />
      </AbsolouteLocator>
    );
    expect(insets(filled.container)).toEqual(insets(explicit.container));
  });
});
