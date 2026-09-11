import React, { useEffect, useState } from 'react';

interface AnimationProps {
  in: boolean;
  children: React.ReactNode;
  duration?: number;
  inDelay?: number;
  outDelay?: number;
}

const FadeInOut: React.FC<AnimationProps> = ({
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
        // Fills its parent explicitly rather than shrink-wrapping content -
        // see the `inset: 0` comment in `stats-graphic-display.tsx`. Without
        // this, an unsized ancestor plus an unsized child here left nothing
        // in the chain to resolve a real box from.
        width: '100%',
        height: '100%',
        opacity: localIn ? 1 : 0,
        transition: `opacity ${duration ?? 0.3}s ease-in-out`
      }}
    >
      {children}
    </div>
  );
};

export default FadeInOut;
