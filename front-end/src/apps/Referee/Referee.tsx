import { FC } from 'react';
import AllianceCards from './components/AllianceCards';
import RefereeLayout from 'src/layouts/RefereeLayout';

const RefereeApp: FC = () => {
  return (
    <RefereeLayout containerWidth='xl'>
      <AllianceCards />
    </RefereeLayout>
  );
};

export default RefereeApp;
