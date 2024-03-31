import { Grid, Paper, Typography } from '@mui/material';
import {
  Alliance,
  BLUE_STATION,
  MatchParticipant,
  Team
} from '@toa-lib/models';
import { FC } from 'react';
import AutocompleteTeam from 'src/components/dropdowns/AutoCompleteTeam';
import { ParticipantCardStatus } from './participant-card-status';
import CheckboxStatus from './checkbox-status';

interface Props {
  alliance: Alliance;
  disabled?: boolean;
  participants?: MatchParticipant[];
  handleChange?: (participants: MatchParticipant[]) => void;
}

export const AllianceCard: FC<Props> = ({
  alliance,
  disabled,
  participants,
  handleChange
}) => {
  const allianceParticipants = participants
    ? participants.filter((p) =>
        alliance === 'red'
          ? p.station < BLUE_STATION
          : p.station >= BLUE_STATION
      )
    : [];
  const changeParticipant = (station: number, teamKey: number) => {
    if (!participants || !handleChange) return;
    const newParticipants = participants.map((p) =>
      p.station === station ? { ...p, teamKey } : p
    );
    handleChange(newParticipants);
  };
  const changeCardStatus = (station: number, cardStatus: number) => {
    if (!participants || !handleChange) return;
    const newParticipants = participants.map((p) =>
      p.station === station ? { ...p, cardStatus } : p
    );
    handleChange(newParticipants);
  };
  const changeNoShow = (station: number, noShow: boolean) => {
    if (!participants || !handleChange) return;
    const newParticipants = participants.map((p) =>
      p.station === station ? { ...p, noShow: Number(noShow) } : p
    );
    handleChange(newParticipants);
  };
  const changeDisqualified = (station: number, disqualified: boolean) => {
    if (!participants || !handleChange) return;
    const newParticipants = participants.map((p) =>
      p.station === station ? { ...p, disqualified: Number(disqualified) } : p
    );
    handleChange(newParticipants);
  };

  return (
    <Paper className={alliance === 'red' ? 'red-bg-imp' : 'blue-bg-imp'}>
      <Grid container spacing={3}>
        <Grid item md={4} sx={{ paddingTop: '4px !important' }}>
          <Typography variant='body1' align='center'>
            Team
          </Typography>
        </Grid>
        <Grid item md={4} sx={{ paddingTop: '4px !important' }}>
          <Typography variant='body1' align='center'>
            Card Status
          </Typography>
        </Grid>
        <Grid item md={2} sx={{ paddingTop: '4px !important' }}>
          <Typography variant='body1' align='center'>
            No Show
          </Typography>
        </Grid>
        <Grid item md={2} sx={{ paddingTop: '4px !important' }}>
          <Typography variant='body1' align='center'>
            DQ
          </Typography>
        </Grid>
      </Grid>
      {allianceParticipants.map((p) => {
        const handleTeamChange = (team: Team | null) => {
          if (!team) return;
          changeParticipant(p.station, team.teamKey);
        };
        const handleCardChange = (status: number) => {
          changeCardStatus(p.station, status);
        };
        const handleNoShowChange = (value: boolean) => {
          changeNoShow(p.station, value);
        };
        const handleDisqualifiedChange = (value: boolean) => {
          changeDisqualified(p.station, value);
        };
        return (
          <Grid key={`${p.teamKey}-${p.station}`} container spacing={3}>
            <Grid item md={4}>
              <AutocompleteTeam
                teamKey={p.teamKey}
                disabled={disabled}
                onUpdate={handleTeamChange}
              />
            </Grid>
            <Grid item md={4}>
              <ParticipantCardStatus
                cardStatus={p.cardStatus}
                disabled={disabled}
                onChange={handleCardChange}
              />
            </Grid>
            <Grid item md={2}>
              <CheckboxStatus
                value={Boolean(p.noShow)}
                disabled={disabled}
                onChange={handleNoShowChange}
              />
            </Grid>
            <Grid item md={2}>
              <CheckboxStatus
                value={Boolean(p.disqualified)}
                disabled={disabled}
                onChange={handleDisqualifiedChange}
              />
            </Grid>
          </Grid>
        );
      })}
    </Paper>
  );
};
