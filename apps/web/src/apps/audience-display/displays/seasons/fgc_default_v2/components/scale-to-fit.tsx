import { FC, ReactNode, useEffect, useState } from 'react';

/** The resolution the full-screen v2 displays are laid out for. */
export const DESIGN_WIDTH = 1920;
export const DESIGN_HEIGHT = 1080;

/**
 * Uniform scale that fits a DESIGN_WIDTH x DESIGN_HEIGHT layout into the
 * viewport. Below 1080p it shrinks (at 1280x720 the rem-sized scores wrapped
 * once they reached three digits); above it grows, so a 4K wall isn't left
 * with 1080p-sized text.
 */
export function designScale(width: number, height: number): number {
  const scale = Math.min(width / DESIGN_WIDTH, height / DESIGN_HEIGHT);
  return Number.isFinite(scale) && scale > 0 ? scale : 1;
}

function viewport() {
  return { width: window.innerWidth, height: window.innerHeight };
}

/**
 * Fills the viewport with `children` laid out at (about) 1080p and scaled to
 * fit. The layout box is the viewport divided by the scale, so a non-16:9
 * screen still fills edge to edge rather than letterboxing.
 */
export const ScaleToFit: FC<{ children: ReactNode }> = ({ children }) => {
  const [size, setSize] = useState(viewport);

  useEffect(() => {
    const onResize = () => setSize(viewport());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const scale = designScale(size.width, size.height);

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      <div
        data-testid='scale-to-fit'
        style={{
          width: `${size.width / scale}px`,
          height: `${size.height / scale}px`,
          transform: `scale(${scale})`,
          transformOrigin: '0 0'
        }}
      >
        {children}
      </div>
    </div>
  );
};
