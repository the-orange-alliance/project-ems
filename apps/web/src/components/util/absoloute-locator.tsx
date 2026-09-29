import React from 'react';

interface AbsoluteLodatorProps {
  children: React.ReactNode;
  top?: number;
  left?: number;
  right?: number;
  bottom?: number;
  /**
   * Pins all four edges (`inset: 0`), giving this box a real size from its
   * containing block instead of shrink-wrapping its content.
   *
   * A bare `position: absolute` with only `top`/`left` has NO resolved width
   * or height, so a percentage-sized child (every wrapper in
   * `src/components/animations/` is `width`/`height: '100%'`) has nothing to
   * resolve against - and a child that is itself `position: absolute`
   * contributes no intrinsic size back, so the whole chain collapses to 0x0
   * and `overflow: hidden` clips it away. Use `fill` unless you deliberately
   * want shrink-to-fit. Explicit edges still win over it.
   */
  fill?: boolean;
}

const AbsoluteLodator: React.FC<AbsoluteLodatorProps> = ({
  children,
  top,
  left,
  bottom,
  right,
  fill
}) => {
  const edge = (value: number | undefined) =>
    value ?? (fill ? 0 : undefined);
  return (
    <div
      style={{
        position: 'absolute',
        top: edge(top),
        left: edge(left),
        bottom: edge(bottom),
        right: edge(right),
        overflow: 'hidden'
      }}
    >
      {children}
    </div>
  );
};

export default AbsoluteLodator;
