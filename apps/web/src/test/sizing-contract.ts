import { expect } from 'vitest';

/**
 * Asserts that every element between `element` and `container` can resolve a
 * real box, so a percentage-sized descendant has something to resolve against.
 *
 * This is the exact defect it exists to catch: an ancestor that is
 * `position: absolute` with only `top`/`left` has no resolved width or height,
 * so it shrink-wraps - and when its content is percentage-sized (or is itself
 * absolutely positioned, contributing no intrinsic size back) the chain
 * collapses to 0x0 and `overflow: hidden` clips the screen away. jsdom has no
 * layout engine, so geometry cannot be measured here; the declared inline
 * styles are checkable and are where both broken links lived.
 */
export function expectResolvableSizingChain(
  element: HTMLElement,
  container: HTMLElement
): void {
  for (
    let node = element.parentElement;
    node && node !== container;
    node = node.parentElement
  ) {
    if (node.style.position !== 'absolute') continue;
    const pinned =
      node.style.top !== '' &&
      node.style.left !== '' &&
      node.style.right !== '' &&
      node.style.bottom !== '';
    const sized = node.style.width !== '' && node.style.height !== '';
    expect(
      pinned || sized,
      `absolutely positioned ancestor <${node.tagName.toLowerCase()}> resolves ` +
        'no box: it needs all four insets (AbsolouteLocator `fill`) or an ' +
        'explicit width+height, or percentage-sized descendants collapse to 0x0'
    ).toBe(true);
  }
}
