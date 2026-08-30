import { FC } from 'react';

/**
 * Large number + label tile used by the season-specific production overlays
 * (see fgc_2025/match-production-view.tsx and fgc_2026/match-production-view.tsx).
 */
export const ScoreContainer: FC<{
  number: string;
  label: string;
  wide?: boolean;
  medium?: boolean;
  bg?: string;
  smallFont?: boolean;
}> = ({ number, label, medium, wide, bg, smallFont }) => {
  return (
    <div>
      <div
        className='production-score-container'
        style={{
          height: '200px',
          width: wide
            ? 'calc(100vw / 2) '
            : medium
              ? 'calc(100vw / 4)'
              : '250px',
          border: '20px solid black',
          textAlign: 'center',
          fontSize: smallFont ? '40px' : '140px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Tomarik Brush',
          backgroundColor: bg ? bg : undefined,
          paddingBottom: '30px'
        }}
      >
        {number}
      </div>
      <h3 style={{ width: '100%', textAlign: 'center', marginBottom: 0 }}>
        {label}
      </h3>
    </div>
  );
};
