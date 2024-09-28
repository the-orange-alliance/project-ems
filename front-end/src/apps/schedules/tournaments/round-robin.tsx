import { Button, Grid } from '@mui/material';
import { AllianceMember, EventSchedule, Team } from '@toa-lib/models';
import { FGC2024 } from '@toa-lib/models/build/fgc/Schedule';
import { FC, useEffect, useState } from 'react';
import { mutate } from 'swr';
import {
  deleteAllianceMembers,
  postAllianceMembers,
  useAllianceMembers
} from 'src/api/use-alliance-data';
import { useRankingsForTournament } from 'src/api/use-ranking-data';
import { useTeamsForEvent } from 'src/api/use-team-data';
import { AutocompleteTeam } from 'src/components/dropdowns/autocomplete-team';
import { useSnackbar } from 'src/hooks/use-snackbar';

interface ParticipantsProps {
  eventSchedule: EventSchedule;
  disabled?: boolean;
}
const ALLIANCE_SIZE = 4;
export const RoundRobinParticipants: FC<ParticipantsProps> = ({
  eventSchedule
}) => {
  const { data: alliances } = useAllianceMembers(
    eventSchedule.eventKey,
    eventSchedule.tournamentKey
  );
  const { data: teams } = useTeamsForEvent(eventSchedule.eventKey);
  const { data: ranks } = useRankingsForTournament(
    eventSchedule.eventKey,
    't1' // hard-coded, stupid. use field in event schedule
  );
  const [allianceRows, setAllianceRows] = useState(0);
  const [pickedTeamKeys, setPickedTeamKeys] = useState<(number | null)[]>([]);
  const { showSnackbar } = useSnackbar();
  const hasDuplicates = pickedTeamKeys.some(
    (v, i) => pickedTeamKeys.indexOf(v) !== i
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (alliances) {
      setAllianceRows(alliances.length / ALLIANCE_SIZE);
      setPickedTeamKeys(alliances.map((a) => a.teamKey));
    }
  }, [alliances]);

  const addAlliance = () => setAllianceRows(allianceRows + 1);
  const removeAlliance = () => setAllianceRows(allianceRows - 1);
  const autoAssign = () => {
    if (!ranks || !teams) return;
    const rankMap = FGC2024.fgcAllianceOrder;
    const teamKeys: (number | null)[] = [];
    for (let i = 0; i < allianceRows; i++) {
      for (let j = 0; j < ALLIANCE_SIZE; j++) {
        const teamKey = ranks.find((r) => r.rank === rankMap[i][j])?.teamKey;
        if (teamKey) {
          teamKeys.push(teamKey);
        } else {
          // FGC2024 - this is the 4th robot. Randomly assign.
          const randomIndex = Math.floor(Math.random() * teams.length);
          teamKeys.push(randomIndex);
        }
      }
    }
    setPickedTeamKeys(teamKeys);
  };
  const saveAlliances = async () => {
    if (!teams) return;
    setLoading(true);
    const { eventKey, tournamentKey } = eventSchedule;
    const allianceMembers = [];
    for (let i = 0; i < allianceRows; i++) {
      for (let j = 0; j < ALLIANCE_SIZE; j++) {
        const teamKey = pickedTeamKeys[i * ALLIANCE_SIZE + j];
        if (!teamKey) continue;
        const allianceMember: AllianceMember = {
          eventKey,
          tournamentKey,
          teamKey,
          allianceNameShort: `#${i + 1}`,
          allianceNameLong: `Alliance ${i + 1}`,
          allianceRank: i + 1,
          isCaptain: j === 0 ? 1 : 0,
          pickOrder: j + 1
        };
        allianceMembers.push(allianceMember);
      }
    }
    try {
      if (alliances) {
        await deleteAllianceMembers(eventKey, tournamentKey);
      }
      await postAllianceMembers(eventKey, allianceMembers);

      mutate(
        `storage/${eventSchedule.eventKey}_${eventSchedule.tournamentKey}.json`,
        {
          ...eventSchedule,
          teams: teams.filter((t) => pickedTeamKeys.includes(t.teamKey)),
          teamsParticipating: pickedTeamKeys.length,
          playoffsOptions: {
            allianceCount: allianceRows
          }
        }
      );
      setLoading(false);
      showSnackbar(`Successfully uploaded alliance members.`);
    } catch (e) {
      const error = e instanceof Error ? `${e.name} ${e.message}` : String(e);
      setLoading(false);
      showSnackbar('Error while uploading alliance members.', error);
    }
  };
  return (
    <Grid container spacing={3}>
      {Array.from({ length: allianceRows }).map((_, i) => {
        return Array.from({ length: ALLIANCE_SIZE }).map((__, j) => {
          const handleChange = (team: Team | null) => {
            if (team) {
              const newTeamKeys = [...pickedTeamKeys];
              newTeamKeys[i * ALLIANCE_SIZE + j] = team.teamKey;
              setPickedTeamKeys(newTeamKeys);
            } else {
              const newTeamKeys = [...pickedTeamKeys];
              newTeamKeys[i * ALLIANCE_SIZE + j] = null;
              setPickedTeamKeys(newTeamKeys);
            }
          };
          return (
            <Grid item xs={12} sm={3} key={`alliance-${i + 1}-team-${j + 1}`}>
              <AutocompleteTeam
                onChange={handleChange}
                teamKey={pickedTeamKeys[i * ALLIANCE_SIZE + j]}
                teams={teams}
              />
            </Grid>
          );
        });
      })}
      <Grid item xs={6} sm={2}>
        <Button
          onClick={addAlliance}
          variant='contained'
          color='primary'
          fullWidth
          disabled={loading}
        >
          Add Alliance
        </Button>
      </Grid>
      <Grid item xs={6} sm={2}>
        <Button
          onClick={removeAlliance}
          variant='contained'
          color='primary'
          fullWidth
          disabled={loading}
        >
          Remove Alliance
        </Button>
      </Grid>
      <Grid item xs={6} sm={2}>
        <Button
          onClick={autoAssign}
          variant='contained'
          color='primary'
          fullWidth
          disabled={loading}
        >
          Auto-Assign
        </Button>
      </Grid>

      <Grid item xs={6} sm={2}>
        <Button
          variant='contained'
          color='primary'
          fullWidth
          onClick={saveAlliances}
          disabled={hasDuplicates || loading}
        >
          Save Alliances
        </Button>
      </Grid>
    </Grid>
  );
};
