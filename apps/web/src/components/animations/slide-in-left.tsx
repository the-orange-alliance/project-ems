import React, { useEffect, useState } from 'react';

interface AnimationProps {
  in: boolean;
  children: React.ReactNode;
  duration?: number;
  inDelay?: number;
  outDelay?: number;
}

const SlideInLeft: React.FC<AnimationProps> = ({
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
        // 100% of the immediate parent, NOT `100vw`/`vh` - see the matching
        // comment in `slide-in-right.tsx`.
        transform: `translateX(${localIn ? '0' : '-100%'})`,
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

export default SlideInLeft;
