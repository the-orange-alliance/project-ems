import { FC } from 'react';
import { useRecoilValue } from 'recoil';
import DefaultLayout from 'src/layouts/DefaultLayout';
import { matchInProgressAtom } from '@stores/NewRecoil';
import { Box } from '@mui/material';
import RefereeSheet from './components/games/CarbonCapture/RefereeSheet';
import ScoreSheetSmall from './components/games/CarbonCapture/ScoreSheetSmall';
import PrestartListener from 'src/components/PrestartListener/PrestartListener';
import MatchStateListener from 'src/components/MatchStateListener/MatchStateListener';
import MatchUpdateListener from 'src/components/MatchUpdateListener/MatchUpdateListener';

const HeadReferee: FC = () => {
  const match = useRecoilValue(matchInProgressAtom);
  const redAlliance = match?.participants?.filter((p) => p.station < 20);
  const blueAlliance = match?.participants?.filter((p) => p.station >= 20);

  return (
    <DefaultLayout containerWidth='xl'>
      <PrestartListener />
      <MatchStateListener />
      <MatchUpdateListener />
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <Box sx={{ display: 'flex', flexDirection: 'row', gap: '16px' }}>
          <RefereeSheet alliance={redAlliance || []} headRef />
          <RefereeSheet alliance={blueAlliance || []} headRef />
        </Box>
        <ScoreSheetSmall headRef />
      </Box>
    </DefaultLayout>
  );
};

export default HeadReferee;
