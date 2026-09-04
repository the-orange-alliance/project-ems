import { Row, Col, Button, Typography, Input } from 'antd';
import {
  AllianceMember,
  ScheduleParams,
  Team,
  FGCSchedule
} from '@toa-lib/models';
import { FC, useEffect, useState } from 'react';
import { allianceApi, useAllianceMembers } from 'src/api/use-alliance-data.js';
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

const defaultAllianceName = (i: number) => ({
  long: `Alliance ${i + 1}`,
  short: `#${i + 1}`
});

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
    't2' // hard-coded, stupid. use field in event schedule
  );
  const [allianceRows, setAllianceRows] = useState(0);
  const [pickedTeamKeys, setPickedTeamKeys] = useState<(number | null)[]>([]);
  const [allianceNames, setAllianceNames] = useState<
    { long: string; short: string }[]
  >([]);
  const { showSnackbar, showErrorSnackbar } = useSnackbar();
  const hasDuplicates = pickedTeamKeys.some(
    (v, i) => pickedTeamKeys.indexOf(v) !== i
  );
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (alliances) {
      const numAlliances = alliances.length / ALLIANCE_SIZE;
      setAllianceRows(numAlliances);

      // Alliance members are keyed by allianceRank, not returned in rank
      // order (the API sorts by allianceNameLong). Sort defensively before
      // mapping positionally into team slots, otherwise custom alliance
      // names reorder the rows and teams reload under the wrong alliance.
      const sorted = [...alliances].sort(
        (a, b) => a.allianceRank - b.allianceRank || a.pickOrder - b.pickOrder
      );
      setPickedTeamKeys(sorted.map((a) => a.teamKey));

      // Extract alliance names from existing alliances
      const names: { long: string; short: string }[] = [];
      for (let i = 0; i < numAlliances; i++) {
        const allianceMember = alliances.find((a) => a.allianceRank === i + 1);
        names.push(
          allianceMember
            ? {
                long: allianceMember.allianceNameLong,
                short: allianceMember.allianceNameShort
              }
            : defaultAllianceName(i)
        );
      }
      setAllianceNames(names);
    }
  }, [alliances]);

  const updateAllianceName = (
    i: number,
    field: 'long' | 'short',
    value: string
  ) => {
    const newNames = [...allianceNames];
    newNames[i] = { ...defaultAllianceName(i), ...newNames[i], [field]: value };
    setAllianceNames(newNames);
  };

  const addAlliance = () => {
    setAllianceRows(allianceRows + 1);
    setAllianceNames([...allianceNames, defaultAllianceName(allianceRows)]);
  };
  const removeAlliance = () => {
    setAllianceRows(allianceRows - 1);
    setAllianceNames(allianceNames.slice(0, -1));
  };
  const autoAssign = () => {
    if (!ranks || !teams) return;
    const rankMap = FGCSchedule.FGC2024.fgcAllianceOrder;
    if (allianceRows > rankMap.length) {
      showErrorSnackbar(
        'Cannot auto-assign alliances.',
        `Auto-Assign supports at most ${rankMap.length} alliances (FGC Table 6-1); you currently have ${allianceRows}. Remove some alliances or assign the extras by hand.`
      );
      return;
    }

    // rankMap only defines the first three picks (captain + 2). Slot 4 — and any
    // pick whose rank has no ranked team — is filled afterwards from the teams
    // not already on an alliance (BUG-027).
    const teamKeys: (number | null)[] = [];
    for (let i = 0; i < allianceRows; i++) {
      for (let j = 0; j < ALLIANCE_SIZE; j++) {
        const rank = rankMap[i]?.[j];
        const teamKey =
          rank !== undefined
            ? ranks.find((r) => r.rank === rank)?.teamKey
            : undefined;
        teamKeys.push(teamKey ?? null);
      }
    }

    const assigned = new Set(teamKeys.filter((k): k is number => k !== null));
    const remaining = teams
      .map((t) => t.teamKey)
      .filter((k) => !assigned.has(k));
    // Fisher-Yates so the 4th-robot draw isn't just the lowest team numbers.
    for (let i = remaining.length - 1; i > 0; i--) {
      const r = Math.floor(Math.random() * (i + 1));
      [remaining[i], remaining[r]] = [remaining[r], remaining[i]];
    }
    let next = 0;
    for (let i = 0; i < teamKeys.length; i++) {
      if (teamKeys[i] === null && next < remaining.length) {
        teamKeys[i] = remaining[next++];
      }
    }

    setPickedTeamKeys(teamKeys);
    const filled = teamKeys.filter((k) => k !== null).length;
    const total = allianceRows * ALLIANCE_SIZE;
    showSnackbar(
      filled === total
        ? `Auto-assigned ${allianceRows} alliance(s) (${filled} teams).`
        : `Auto-assigned ${allianceRows} alliance(s); ${
            total - filled
          } slot(s) left empty — not enough teams to fill every alliance.`
    );
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
          allianceNameShort:
            allianceNames[i]?.short || defaultAllianceName(i).short,
          allianceNameLong:
            allianceNames[i]?.long || defaultAllianceName(i).long,
          allianceRank: i + 1,
          isCaptain: j === 0 ? 1 : 0,
          pickOrder: j + 1
        };
        allianceMembers.push(allianceMember);
      }
    }
    try {
      if (alliances) {
        await allianceApi.delete.members(eventKey, tournamentKey);
      }
      await allianceApi.create.members(eventKey, allianceMembers);

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
      setLoading(false);
      showErrorSnackbar('Error while uploading alliance members.', e);
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
                <Row gutter={[8, 8]} align='middle'>
                  <Col>
                    <Typography.Title level={4} style={{ margin: 0 }}>
                      #{i + 1}
                    </Typography.Title>
                  </Col>
                  <Col flex='auto'>
                    <Input
                      placeholder='Alliance Name (e.g., Alliance 1)'
                      value={allianceNames[i]?.long || ''}
                      maxLength={50}
                      onChange={(e) =>
                        updateAllianceName(i, 'long', e.target.value)
                      }
                      style={{ maxWidth: '300px' }}
                    />
                  </Col>
                  <Col>
                    <Input
                      placeholder='Short (e.g., #1)'
                      value={allianceNames[i]?.short || ''}
                      maxLength={5}
                      onChange={(e) =>
                        updateAllianceName(i, 'short', e.target.value)
                      }
                      style={{ maxWidth: '120px' }}
                    />
                  </Col>
                </Row>
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
