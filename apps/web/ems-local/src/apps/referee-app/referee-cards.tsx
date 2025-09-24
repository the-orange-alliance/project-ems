import { FC } from 'react';
import { AllianceCards } from './components/alliance-cards.js';
import { RefereeLayout } from 'src/layouts/referee-layout.js';

export const RefereeApp: FC = () => {
  return (
    <RefereeLayout containerWidth='xl'>
      <AllianceCards />
    </RefereeLayout>
  );
};
