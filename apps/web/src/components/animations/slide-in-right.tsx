import React, { useEffect, useState } from 'react';

interface AnimationProps {
  in: boolean;
  children: React.ReactNode;
  duration?: number;
  inDelay?: number;
  outDelay?: number;
}

const SlideInRight: React.FC<AnimationProps> = ({
  in: elementIn,
  children,
  duration,
  inDelay,
  outDelay
}) => {
  const [localIn, setLocalIn] = useState(false);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const delay = elementIn ? inDelay : outDelay;

    if (typeof delay === 'number') {
      timeoutId = setTimeout(() => {
        setLocalIn(elementIn);
      }, delay * 1000);
    } else {
      setLocalIn(elementIn);
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [elementIn, inDelay, outDelay]);

  return (
    <div
      style={{
        // 100% of the immediate parent, NOT `100vw` - this is composited at
        // wildly different real sizes (a full-bleed broadcast source, a
        // ~340px producer-monitor box, an editor preview pane), and `vw`
        // resolves against the browser viewport regardless of where this is
        // actually mounted. See the `inset: 0` comment in
        // `stats-graphic-display.tsx` for the rest of this sizing chain.
        transform: `translateX(${localIn ? '0' : '100%'})`,
        transition: `transform ${duration ?? 0.3}s ease-in-out`,
        overflow: 'hidden',
        height: '100%',
        width: '100%'
      }}
    >
      {children}
    </div>
  );
};

export default SlideInRight;
