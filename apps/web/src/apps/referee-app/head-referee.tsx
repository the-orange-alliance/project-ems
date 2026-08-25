import { FC } from 'react';
import { useSeasonComponents } from 'src/hooks/use-season-components.js';
import { RefereeLayout } from 'src/layouts/referee-layout.js';

export const HeadReferee: FC = () => {
  const seasonComponents = useSeasonComponents();

  if (!seasonComponents) {
    return (
      <div>Uh oh, something bad happened. Contact event software support.</div>
    );
  }

  return (
    <RefereeLayout containerWidth='xl'>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          marginBottom: 8
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'row', gap: '16px' }}>
          <seasonComponents.RefereeScoreSheet alliance='red' />
          <seasonComponents.RefereeScoreSheet alliance='blue' />
        </div>
      </div>
      {seasonComponents.HeadRefExtrasSheet && (
        <seasonComponents.HeadRefExtrasSheet />
      )}
    </RefereeLayout>
  );
};
