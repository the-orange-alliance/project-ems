import { FC, SyntheticEvent, useState } from 'react';
import { RefereeScoreSheetProps } from '@seasons/index';
import { useSocket } from 'src/api/use-socket';
import { SetterOrUpdater, useRecoilState } from 'recoil';
import { matchOccurringAtom } from '@stores/recoil';
import {
  HydrogenHorizons,
  Match,
  MatchSocketEvent,
  ItemUpdate,
  NumberAdjustment
} from '@toa-lib/models';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import { Typography } from '@mui/material';
import { ConnectionChip } from 'src/components/util/connection-chip';
import { MatchChip } from 'src/components/util/match-chip';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import { TabPanel } from 'src/components/util/tab-panel';
import TeleScoreSheet from './TeleOpScoreSheet';
import TeamSheet from './TeamSheet';
import PenaltySheet from './PenaltySheet';

const ScoreSheet: FC<RefereeScoreSheetProps> = ({ alliance }) => {
  const [socket] = useSocket();
  const [match, setMatch]: [
    Match<HydrogenHorizons.MatchDetails> | null,
    SetterOrUpdater<Match<HydrogenHorizons.MatchDetails> | null>
  ] = useRecoilState(matchOccurringAtom);

  const [tabIndex, setTabIndex] = useState(0);

  const participants = match?.participants
    ?.filter((p) => (alliance === 'red' ? p.station < 20 : p.station >= 20))
    .slice(0, 3);

  const handleChange = (event: SyntheticEvent, newValue: number) => {
    setTabIndex(newValue);
  };

  const handleMatchItemUpdate = <
    K extends keyof Match<HydrogenHorizons.MatchDetails>
  >(
    key: K,
    value: Match<HydrogenHorizons.MatchDetails>[K]
  ) => {
    const updatePacket: ItemUpdate = { key, value };
    socket?.emit(MatchSocketEvent.MATCH_UPDATE_ITEM, updatePacket);

    // Reduce UI latency by updating our local match state in anticipation
    // of the update that the server wil send soon
    if (match) {
      const newMatch = Object.assign({}, { ...match, [key]: value });
      setMatch(newMatch);
    }
  };

  const handleMatchDetailsUpdate = <
    K extends keyof HydrogenHorizons.MatchDetails
  >(
    detailsKey: K,
    value: HydrogenHorizons.MatchDetails[K]
  ) => {
    const updatePacket: ItemUpdate = { key: detailsKey, value };
    socket?.emit(MatchSocketEvent.MATCH_UPDATE_DETAILS_ITEM, updatePacket);

    // Reduce UI latency by updating our local match state in anticipation
    // of the update that the server wil send soon
    if (match?.details) {
      const details = Object.assign(
        {},
        { ...match.details, [detailsKey]: value }
      );
      const newMatch = Object.assign({}, { ...match, details });
      setMatch(newMatch);
    }
  };

  const handleMatchDetailsAdjustment = <
    K extends keyof HydrogenHorizons.MatchDetails
  >(
    detailsKey: K,
    adjustment: number
  ) => {
    const adjustmentPacket: NumberAdjustment = { key: detailsKey, adjustment };
    socket?.emit(
      MatchSocketEvent.MATCH_ADJUST_DETAILS_NUMBER,
      adjustmentPacket
    );

    // Reduce UI latency by updating our local match state in anticipation
    // of the update that the server wil send soon
    if (match?.details) {
      const details = Object.assign(
        {},
        {
          ...match.details,
          [detailsKey]: (match.details[detailsKey] as number) + adjustment
        }
      );
      const newMatch = Object.assign({}, { ...match, details });
      setMatch(newMatch);
    }
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
            onMatchDetailsAdjustment={handleMatchDetailsAdjustment}
            onMatchDetailsUpdate={handleMatchDetailsUpdate}
          />
        </TabPanel>
        <TabPanel value={tabIndex} index={1}>
          {participants?.map((p) => (
            <TeamSheet
              key={`${p.eventKey}-${p.tournamentKey}-${p.station}`}
              station={p.station}
            />
          ))}
          <PenaltySheet
            alliance={alliance}
            onMatchItemUpdate={handleMatchItemUpdate}
          />
        </TabPanel>
      </Box>
    </Paper>
  );
};

export default ScoreSheet;
