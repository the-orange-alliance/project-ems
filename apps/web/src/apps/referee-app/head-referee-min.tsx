import { FC } from 'react';
import { useSeasonComponents } from 'src/hooks/use-season-components.js';
import { RefereeLayout } from 'src/layouts/referee-layout.js';

export const HeadRefereeMin: FC = () => {
  const seasonComponents = useSeasonComponents();

  if (!seasonComponents) {
    return (
      <div>Uh oh, something bad happened. Contact event software support.</div>
    );
  }

  return (
    <RefereeLayout containerWidth='xl'>
      {seasonComponents.HeadRefExtrasSheet && (
        <seasonComponents.HeadRefExtrasSheet />
      )}
    </RefereeLayout>
  );
};
