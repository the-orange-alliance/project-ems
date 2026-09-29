import { act, render } from '@testing-library/react';
import type { FC, ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import {
  FadeInOut,
  SlideInBottom,
  SlideInLeft,
  SlideInRight
} from './index.js';

interface AnimationProps {
  in: boolean;
  children: ReactNode;
  duration?: number;
  inDelay?: number;
  outDelay?: number;
}

const wrappers: [string, FC<AnimationProps>][] = [
  ['FadeInOut', FadeInOut],
  ['SlideInBottom', SlideInBottom],
  ['SlideInLeft', SlideInLeft],
  ['SlideInRight', SlideInRight]
];

/** The out-state transform each slide wrapper must park at. */
const slideOut: [string, FC<AnimationProps>, string][] = [
  ['SlideInBottom', SlideInBottom, 'translateY(100%)'],
  ['SlideInLeft', SlideInLeft, 'translateX(-100%)'],
  ['SlideInRight', SlideInRight, 'translateX(100%)']
];

function root(container: HTMLElement) {
  return container.firstElementChild as HTMLElement;
}

describe('animation wrappers: sizing contract', () => {
  // These wrappers are PARENT-RELATIVE by design - they were moved off
  // `100vh`/`100vw` so the stats graphics could render inside a small
  // producer-monitor box instead of measuring the whole browser window.
  // Reverting them to viewport units re-breaks that, so the contract is
  // locked here; the corresponding obligation (every absolute ancestor must
  // resolve a real box) is enforced by `src/test/sizing-contract.ts`.
  it.each(wrappers)('%s fills its parent, not the viewport', (_name, Wrapper) => {
    const { container } = render(
      <Wrapper in={false}>
        <span />
      </Wrapper>
    );
    expect(root(container).style.width).toBe('100%');
    expect(root(container).style.height).toBe('100%');
  });
});

describe('animation wrappers: in/out state', () => {
  it.each(slideOut)(
    '%s parks off-parent when out and at origin when in',
    (_name, Wrapper, outTransform) => {
      const out = render(
        <Wrapper in={false}>
          <span />
        </Wrapper>
      );
      expect(root(out.container).style.transform).toBe(outTransform);

      const inn = render(
        <Wrapper in>
          <span />
        </Wrapper>
      );
      expect(root(inn.container).style.transform).toBe(
        outTransform.startsWith('translateY')
          ? 'translateY(0)'
          : 'translateX(0)'
      );
    }
  );

  it('FadeInOut moves opacity 0 -> 1 and honours duration', () => {
    const { container } = render(
      <FadeInOut in duration={0.5}>
        <span />
      </FadeInOut>
    );
    expect(root(container).style.opacity).toBe('1');
    expect(root(container).style.transition).toContain('0.5s');
  });

  it('holds the out state until inDelay elapses', () => {
    vi.useFakeTimers();
    const { container } = render(
      <SlideInBottom in inDelay={0.75}>
        <span />
      </SlideInBottom>
    );
    expect(root(container).style.transform).toBe('translateY(100%)');
    act(() => {
      vi.advanceTimersByTime(750);
    });
    expect(root(container).style.transform).toBe('translateY(0)');
  });
});
