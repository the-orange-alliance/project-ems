import { useEffect, useState } from 'react';

/** The viewport height in pixels, updated on resize. */
export const useWindowHeight = (): number => {
  const [height, setHeight] = useState(window.innerHeight);
  useEffect(() => {
    const onResize = () => setHeight(window.innerHeight);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return height;
};
