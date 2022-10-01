import { FC } from 'react';
import DefaultLayout from 'src/layouts/DefaultLayout';
import AllianceCards from './components/AllianceCards';

const RefereeApp: FC = () => {
  return (
    <DefaultLayout containerWidth='xl'>
      <AllianceCards />
    </DefaultLayout>
  );
};

export default RefereeApp;
