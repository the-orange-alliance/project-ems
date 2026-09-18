import { act, render } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { Stage } from './composition.js';

it('fits a small host before any observer callback, then tracks resize and cleans up', () => {
  let width = 320;
  let height = 180;
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(
    () => width
  );
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockImplementation(
    () => height
  );
  let resize: ResizeObserverCallback | undefined;
  const disconnect = vi.fn();
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: ResizeObserverCallback) {
        resize = callback;
      }
      observe() {}
      disconnect = disconnect;
    }
  );
  const { container, unmount } = render(
    <Stage>
      <div>Frame</div>
    </Stage>
  );
  const canvas = container.firstElementChild!.firstElementChild as HTMLElement;
  // No ResizeObserver entry has been delivered: the first committed canvas already fits.
  expect(canvas.style.transform).toBe(`translate(-50%, -50%) scale(${1 / 6})`);
  width = 400;
  height = 400;
  act(() => resize!([], {} as ResizeObserver));
  expect(canvas.style.transform).toBe(
    `translate(-50%, -50%) scale(${400 / 1920})`
  );
  width = 640;
  height = 360;
  act(() => window.dispatchEvent(new Event('resize')));
  expect(canvas.style.transform).toBe(`translate(-50%, -50%) scale(${1 / 3})`);
  unmount();
  expect(disconnect).toHaveBeenCalledOnce();
});

it('measures without ResizeObserver and retains viewport fallback for unconstrained hosts', () => {
  vi.stubGlobal('ResizeObserver', undefined);
  let width = 320;
  let height = 180;
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(
    () => width
  );
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockImplementation(
    () => height
  );
  const { container } = render(<Stage>Frame</Stage>);
  const canvas = container.firstElementChild!.firstElementChild as HTMLElement;
  expect(canvas.style.transform).toContain(`scale(${1 / 6})`);
  width = 0;
  height = 0;
  act(() => window.dispatchEvent(new Event('resize')));
  expect(canvas.style.transform).toContain(
    `scale(${Math.min(window.innerWidth / 1920, window.innerHeight / 1080)})`
  );
});
