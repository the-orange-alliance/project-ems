import { FC } from 'react';
import { AllianceCards } from './components/alliance-cards';
import RefereeLayout from 'src/layouts/RefereeLayout';

export const RefereeApp: FC = () => {
  return (
    <RefereeLayout containerWidth='xl'>
      <AllianceCards />
    </RefereeLayout>
  );
};
