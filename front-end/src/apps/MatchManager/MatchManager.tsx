import { FC } from 'react';
import DefaultLayout from 'src/layouts/DefaultLayout';
import DefaultHeader from 'src/partials/DefaultHeader/DefaultHeader';

const MatchManager: FC = () => {
  return (
    <DefaultLayout containerWidth='xl'>
      <DefaultHeader title='Match Manager'>Testing content</DefaultHeader>
    </DefaultLayout>
  );
};

export default MatchManager;
