import { FC } from 'react';
import { useRecoilValue } from 'recoil';
import { teamsAtom } from 'src/stores/Recoil';
import TeamsReport from './components/TeamsReport';

const GeneralReports: FC = () => {
  const teams = useRecoilValue(teamsAtom);

  return <TeamsReport teams={teams} />;
};

export default GeneralReports;
