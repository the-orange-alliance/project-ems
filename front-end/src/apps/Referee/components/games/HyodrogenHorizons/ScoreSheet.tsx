import { FC, useState, SyntheticEvent } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import { Alliance, HydrogenHorizons, Match } from '@toa-lib/models';
import ConnectionChip from 'src/components/ConnectionChip/ConnectionChip';
import MatchChip from 'src/components/MatchChip/MatchChip';
import { useRecoilValue } from 'recoil';
import { matchInProgressAtom } from 'src/stores/NewRecoil';
import TeamSheet from './TeamSheet';
import PenaltySheet from './PenaltySheet';
import TabPanel from 'src/components/TabPanel/TabPanel';
import TeleScoreSheet from './TeleOpScoreSheet';
import { useSocket } from 'src/api/SocketProvider';

interface Props {
  alliance: Alliance;
}

const ScoreSheet: FC<Props> = ({ alliance }) => {
  const [socket] = useSocket();
  const match = useRecoilValue(matchInProgressAtom);

  const [tabIndex, setTabIndex] = useState(0);

  const participants = match?.participants?.filter((p) =>
    alliance === 'red' ? p.station < 20 : p.station >= 20
  );

  const handleChange = (event: SyntheticEvent, newValue: number) => {
    setTabIndex(newValue);
  };

  const handleMatchUpdate = (
    newMatch: Match<HydrogenHorizons.MatchDetails>
  ) => {
    socket?.emit('match:update', newMatch);
  };

  return (
    <Paper
      sx={{
        padding: (theme) => theme.spacing(2),
        borderStyle: 'solid',
        borderWidth: 'thick',
        borderColor: alliance === 'red' ? '#de1f1f' : '#1f85de',
        width: '100%'
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <Typography variant='h5' sx={{ textAlign: 'center' }}>
          {alliance === 'red' ? 'Red' : 'Blue'} Alliance
        </Typography>
        <Box className='center'>
          <ConnectionChip />
          <MatchChip match={match} />
        </Box>
        <Tabs value={tabIndex} onChange={handleChange} variant='fullWidth'>
          <Tab label='TeleOp' />
          <Tab label='Cards/Fouls' />
        </Tabs>
        <TabPanel value={tabIndex} index={0}>
          <TeleScoreSheet
            alliance={alliance}
            participants={participants}
            onUpdate={handleMatchUpdate}
          />
        </TabPanel>
        <TabPanel value={tabIndex} index={1}>
          {participants?.map((p) => (
            <TeamSheet
              key={`${p.eventKey}-${p.tournamentKey}-${p.station}`}
              station={p.station}
            />
          ))}
          <PenaltySheet alliance='red' onUpdate={handleMatchUpdate} />
        </TabPanel>
      </Box>
    </Paper>
  );
};

export default ScoreSheet;
