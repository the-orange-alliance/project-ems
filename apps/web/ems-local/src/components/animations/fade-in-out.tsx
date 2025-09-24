import { Box } from '@mui/material';
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
    let timeoutId: NodeJS.Timeout;

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
    <Box
      sx={{
        opacity: localIn ? 1 : 0,
        transition: `opacity ${duration ?? 0.3}s ease-in-out`
      }}
    >
      {children}
    </Box>
  );
};

export default FadeInOut;
