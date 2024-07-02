import { FC } from 'react';
import { AllianceCards } from './components/alliance-cards';
import { RefereeLayout } from 'src/layouts/referee-layout';

export const RefereeApp: FC = () => {
  return (
    <RefereeLayout containerWidth='xl'>
      <AllianceCards />
    </RefereeLayout>
  );
};
