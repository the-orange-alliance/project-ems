import { useEffect } from 'react';

export function useHiddenMotionlessCursor(): void {
  useEffect(() => {
    let mouseStoppedMovingTimeout: number = -1;
    const hideCursor = (): void => {
      document.body.style.cursor = 'none';
    };
    const onMouseMove = (): void => {
      // The cursor is being moved, display it for the next 500ms
      document.body.style.cursor = '';
      clearTimeout(mouseStoppedMovingTimeout);
      mouseStoppedMovingTimeout = window.setTimeout(() => hideCursor(), 500);
    };

    hideCursor();
    window.addEventListener('mousemove', onMouseMove);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
    };
  }, []);
}
