import React from 'react';

interface AbsoluteLodatorProps {
  children: React.ReactNode;
  top?: number;
  left?: number;
  right?: number;
  bottom?: number;
}

const AbsoluteLodator: React.FC<AbsoluteLodatorProps> = ({
  children,
  top,
  left,
  bottom,
  right
}) => {
  return (
    <div
      style={{
        position: 'absolute',
        top,
        left,
        bottom,
        right,
        overflow: 'hidden'
      }}
    >
      {children}
    </div>
  );
};

export default AbsoluteLodator;
