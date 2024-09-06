import { FC, SyntheticEvent, useState } from 'react';
import { RefereeScoreSheetProps } from '@seasons/index';
import { useSocket } from 'src/api/use-socket';
import { SetterOrUpdater, useRecoilState } from 'recoil';
import { matchOccurringAtom } from '@stores/recoil';
import {
  Match,
  MatchSocketEvent,
  ItemUpdate,
  NumberAdjustment,
  MatchDetailBase,
  Alliance,
  MatchParticipant
} from '@toa-lib/models';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import { Stack, Typography } from '@mui/material';
import { ConnectionChip } from 'src/components/util/connection-chip';
import { MatchChip } from 'src/components/util/match-chip';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import { TabPanel } from 'src/components/util/tab-panel';
import TeamSheet from 'src/seasons/fgc-generic/referee/TeamSheet';
import PenaltySheet from 'src/seasons/fgc-generic/referee/PenaltySheet';
import { SyncMatchStateToRecoil } from 'src/components/sync-effects/sync-match-state-to-recoil';
import { SyncOnPrestart } from 'src/components/sync-effects/sync-on-prestart';

// forever hail the generic types

export interface TeleOpProps<DetailsType extends MatchDetailBase> {
  alliance: Alliance;
  participants: MatchParticipant[] | undefined;
  onMatchDetailsAdjustment: <K extends keyof DetailsType>(
    detailsKey: K,
    adjustment: number
  ) => void;
  onMatchDetailsUpdate: <K extends keyof DetailsType>(
    detailsKey: K,
    value: DetailsType[K]
  ) => void;
}

interface GenericScoreSheetProps<DetailsType extends MatchDetailBase>
  extends RefereeScoreSheetProps {
  TeleopScoreSheet: FC<TeleOpProps<DetailsType>>;
}

const GenericScoreSheet = <DetailsType extends MatchDetailBase>({
  alliance,
  TeleopScoreSheet
}: GenericScoreSheetProps<DetailsType>) => {
  const [socket] = useSocket();
  const [match, setMatch]: [
    Match<DetailsType> | null,
    SetterOrUpdater<Match<DetailsType> | null>
  ] = useRecoilState(matchOccurringAtom);

  const [tabIndex, setTabIndex] = useState(0);

  const participants = match?.participants
    ?.filter((p) => (alliance === 'red' ? p.station < 20 : p.station >= 20))
    .slice(0, 3);

  const handleChange = (event: SyntheticEvent, newValue: number) => {
    setTabIndex(newValue);
  };

  const handleMatchItemUpdate = <K extends keyof Match<DetailsType>>(
    key: K,
    value: Match<DetailsType>[K]
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

  const handleMatchDetailsUpdate = <K extends keyof DetailsType>(
    detailsKey: K,
    value: DetailsType[K]
  ) => {
    const updatePacket: ItemUpdate = { key: String(detailsKey), value };
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

  const handleMatchDetailsAdjustment = <K extends keyof DetailsType>(
    detailsKey: K,
    adjustment: number
  ) => {
    const adjustmentPacket: NumberAdjustment = {
      key: String(detailsKey),
      adjustment
    };
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
      <SyncMatchStateToRecoil />
      <SyncOnPrestart />
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <Typography variant='h5' sx={{ textAlign: 'center' }}>
          {alliance === 'red' ? 'Red' : 'Blue'} Alliance
        </Typography>
        <Stack direction='row' className='center' spacing={1}>
          <ConnectionChip />
          <MatchChip match={match} />
        </Stack>
        <Tabs value={tabIndex} onChange={handleChange} variant='fullWidth'>
          <Tab label='TeleOp' />
          <Tab label='Cards/Fouls' />
        </Tabs>
        <TabPanel value={tabIndex} index={0}>
          <TeleopScoreSheet
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
          <PenaltySheet<DetailsType>
            alliance={alliance}
            onMatchItemUpdate={handleMatchItemUpdate}
          />
        </TabPanel>
      </Box>
    </Paper>
  );
};

export default GenericScoreSheet;
