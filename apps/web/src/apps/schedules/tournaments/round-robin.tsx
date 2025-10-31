import { Row, Col, Button, Typography } from 'antd';
import {
  AllianceMember,
  ScheduleParams,
  Team,
  FGCSchedule
} from '@toa-lib/models';
import { FC, useEffect, useState } from 'react';
import {
  deleteAllianceMembers,
  postAllianceMembers,
  useAllianceMembers
} from 'src/api/use-alliance-data.js';
import { useRankingsForTournament } from 'src/api/use-ranking-data.js';
import { useTeamsForEvent } from 'src/api/use-team-data.js';
import { AutocompleteTeam } from 'src/components/dropdowns/autocomplete-team.js';
import { useSnackbar } from 'src/hooks/use-snackbar.js';

interface ParticipantsProps {
  eventSchedule: ScheduleParams;
  onEventScheduleChange?: (eventSchedule: ScheduleParams) => void;
  disabled?: boolean;
}
const ALLIANCE_SIZE = 4;
export const RoundRobinParticipants: FC<ParticipantsProps> = ({
  eventSchedule,
  onEventScheduleChange
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
    const rankMap = FGCSchedule.FGC2024.fgcAllianceOrder;
    const teamKeys: (number | null)[] = [];
    for (let i = 0; i < allianceRows; i++) {
      for (let j = 0; j < ALLIANCE_SIZE; j++) {
        const teamKey = ranks.find((r) => r.rank === rankMap[i][j])?.teamKey;
        if (teamKey) {
          teamKeys.push(teamKey);
        } else {
          // FGC2024/25 - this is the 4th robot, assign -1 for now, and we'll handle it after the rest of the assignments are in
          teamKeys.push(-1);
        }
      }
    }

    // Now handle any -1 assignments (randomly assign remaining teams)
    for (let i = 0; i < teamKeys.length; i++) {
      if (teamKeys[i] === -1) {
        // Randomly assign.
        let [teamKey] = teamKeys;

        // Make sure we don't assign a team that is already picked. Keep picking randomly until we find one.
        while (teamKeys.includes(teamKey)) {
          const randomIndex = Math.floor(Math.random() * ranks.length);
          ({ teamKey } = ranks[randomIndex]);
        }

        teamKeys[i] = teamKey;
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

      onEventScheduleChange?.({
        ...eventSchedule,
        teamKeys: (pickedTeamKeys ?? []).filter((k) => k !== null) as number[],
        options: {
          ...eventSchedule.options,
          allianceCount: allianceRows
        }
      });
      setLoading(false);
      showSnackbar(`Successfully uploaded alliance members.`);
    } catch (e) {
      const error = e instanceof Error ? `${e.name} ${e.message}` : String(e);
      setLoading(false);
      showSnackbar('Error while uploading alliance members.', error);
    }
  };
  return (
    <>
      <Row gutter={[24, 0]}>
        {Array.from({ length: allianceRows }).map((_, i) => {
          return (
            <>
              <Col
                span={24}
                key={`alliance-${i + 1}-header`}
                style={{ marginTop: '1rem' }}
              >
                <Typography.Title level={4}>Alliance {i + 1}</Typography.Title>
              </Col>
              {Array.from({ length: ALLIANCE_SIZE }).map((__, j) => {
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
                  <Col
                    xs={24}
                    sm={12}
                    md={6}
                    lg={3}
                    key={`alliance-${i + 1}-team-${j + 1}`}
                  >
                    <AutocompleteTeam
                      onChange={handleChange}
                      teamKey={pickedTeamKeys[i * ALLIANCE_SIZE + j]}
                      teams={teams}
                    />
                  </Col>
                );
              })}
            </>
          );
        })}
      </Row>
      <Row style={{ marginTop: '1rem' }} gutter={[24, 24]}>
        <Col xs={12} sm={6} md={4} lg={2}>
          <Button onClick={addAlliance} type='primary' block disabled={loading}>
            Add Alliance
          </Button>
        </Col>
        <Col xs={12} sm={6} md={4} lg={2}>
          <Button
            onClick={removeAlliance}
            type='primary'
            block
            disabled={loading}
          >
            Remove Alliance
          </Button>
        </Col>
        <Col xs={12} sm={6} md={4} lg={2}>
          <Button onClick={autoAssign} type='primary' block disabled={loading}>
            Auto-Assign
          </Button>
        </Col>
        <Col xs={12} sm={6} md={4} lg={2}>
          <Button
            type='primary'
            block
            onClick={saveAlliances}
            disabled={hasDuplicates || loading}
          >
            Save Alliances
          </Button>
        </Col>
      </Row>
    </>
  );
};
