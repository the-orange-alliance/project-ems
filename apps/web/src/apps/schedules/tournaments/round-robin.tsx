import {
  Row,
  Col,
  Button,
  Typography,
  Input,
  Tooltip,
  Flex,
  Grid,
  Dropdown,
  Divider
} from 'antd';
import {
  DownOutlined,
  MinusOutlined,
  PlusOutlined,
  SaveOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import {
  AllianceMember,
  ScheduleParams,
  Team,
  Tournament
} from '@toa-lib/models';
import { FC, Fragment, useEffect, useState } from 'react';
import { allianceApi, useAllianceMembers } from 'src/api/use-alliance-data.js';
import { useTeamsForEvent } from 'src/api/use-team-data.js';
import { AutocompleteTeam } from 'src/components/dropdowns/autocomplete-team.js';
import { useSnackbar } from 'src/hooks/use-snackbar.js';
import {
  pullAlliancesFromTournament,
  usePreviousTournamentSources
} from '../util/use-previous-tournament-alliances.js';

const { useBreakpoint } = Grid;

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
  const screens = useBreakpoint();
  const stackButtons = screens.xs && !screens.sm;
  const { candidates, take, allianceSize, seedMap } =
    usePreviousTournamentSources(eventSchedule);
  const [allianceRows, setAllianceRows] = useState(0);
  const [pickedTeamKeys, setPickedTeamKeys] = useState<(number | null)[]>([]);
  const [allianceNames, setAllianceNames] = useState<
    { long: string; short: string }[]
  >([]);
  const [pullLoading, setPullLoading] = useState(false);
  const { showSnackbar, showErrorSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(false);

  // Only the slots that belong to the current alliance rows, teams only.
  const filledTeamKeys = pickedTeamKeys
    .slice(0, allianceRows * ALLIANCE_SIZE)
    .filter((k): k is number => k != null && k > 0);
  const duplicateTeamKey = filledTeamKeys.find(
    (v, i) => filledTeamKeys.indexOf(v) !== i
  );
  const hasDuplicates = duplicateTeamKey != null;
  const emptySlotCount = allianceRows * ALLIANCE_SIZE - filledTeamKeys.length;

  const saveBlockedReason = loading
    ? undefined
    : allianceRows === 0
      ? 'Add at least one alliance (or use Auto-Assign) before saving.'
      : hasDuplicates
        ? `Team ${duplicateTeamKey} is assigned to more than one slot - each team may appear only once.`
        : filledTeamKeys.length === 0
          ? 'Assign teams to the alliance slots before saving.'
          : undefined;
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
  const pullFrom = async (source: Tournament) => {
    setPullLoading(true);
    try {
      const { alliances: pulled, mode } = await pullAlliancesFromTournament(
        eventSchedule.eventKey,
        source,
        { take, allianceSize, seedMap }
      );
      if (pulled.length === 0) {
        showSnackbar(
          source.tournamentType === 'Ranking' ||
            source.tournamentType === 'Qualification'
            ? `No rankings on ${source.name} yet. Score its matches (or recalculate rankings) first.`
            : `No alliances saved on ${source.name} yet. Build and save that tournament's alliances first.`
        );
        return;
      }
      setAllianceRows(pulled.length);
      setAllianceNames(
        pulled.map((a, i) => ({
          long: a.allianceNameLong || defaultAllianceName(i).long,
          short: a.allianceNameShort || defaultAllianceName(i).short
        }))
      );
      const teamKeys: (number | null)[] = [];
      for (const alliance of pulled) {
        for (let j = 0; j < ALLIANCE_SIZE; j++) {
          const teamKey = alliance.teamKeys[j];
          teamKeys.push(teamKey && teamKey > 0 ? teamKey : null);
        }
      }
      setPickedTeamKeys(teamKeys);
      showSnackbar(
        (mode === 'seed'
          ? `Built ${pulled.length} alliances from ${source.name} rankings (FGC Table 6-1 serpentine draft).`
          : `Pulled the top ${pulled.length} alliances from ${source.name} standings.`) +
          ' Review, then Save Alliances.'
      );
    } catch (e) {
      showErrorSnackbar(`Error while pulling from ${source.name}.`, e);
    } finally {
      setPullLoading(false);
    }
  };

  const isQualPhase = (t?: Tournament) =>
    t?.tournamentType === 'Ranking' || t?.tournamentType === 'Qualification';

  const autoAssignTip = (source?: Tournament): string => {
    if (!source) {
      return 'No earlier tournament (qualification, ranking, or round robin) to build alliances from.';
    }
    return isQualPhase(source)
      ? `Build ${take} alliances from ${source.name} rankings using the FGC serpentine draft (Table 6-1: #1/#9/#24, #2/#10/#23, …). The 4th robot in each alliance is a random draw from the remaining teams.`
      : `Fill the alliances from the top ${take} of ${source.name}, carrying each alliance's teams and name in final-standings order.`;
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
            <Fragment key={`alliance-${i + 1}`}>
              {i > 0 && (
                <Col span={24}>
                  <Divider style={{ margin: 0 }} />
                </Col>
              )}
              <Col
                span={24}
                style={{ marginTop: '0.75rem', marginBottom: '0.75rem' }}
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
                    style={{ marginBottom: '1rem' }}
                  >
                    <AutocompleteTeam
                      onChange={handleChange}
                      teamKey={pickedTeamKeys[i * ALLIANCE_SIZE + j]}
                      teams={teams}
                    />
                  </Col>
                );
              })}
            </Fragment>
          );
        })}
      </Row>
      <Flex
        style={{ marginTop: '1.5rem' }}
        gap='small'
        wrap
        vertical={stackButtons}
        justify={stackButtons ? undefined : 'flex-end'}
      >
        <Button
          onClick={addAlliance}
          type='dashed'
          icon={<PlusOutlined />}
          block={stackButtons}
          disabled={loading}
        >
          Add Alliance
        </Button>
        <Button
          onClick={removeAlliance}
          danger
          icon={<MinusOutlined />}
          block={stackButtons}
          disabled={loading || allianceRows === 0}
        >
          Remove Alliance
        </Button>
        {candidates.length > 1 ? (
          <Dropdown
            trigger={['click']}
            disabled={loading || pullLoading}
            menu={{
              items: candidates.map((t) => ({
                key: t.tournamentKey,
                icon: <ThunderboltOutlined />,
                label: (
                  <Flex vertical>
                    <span>{t.name}</span>
                    <Typography.Text type='secondary' style={{ fontSize: 12 }}>
                      {isQualPhase(t)
                        ? 'serpentine draft from rankings'
                        : 'carry top alliances by standings'}
                    </Typography.Text>
                  </Flex>
                ),
                onClick: () => pullFrom(t)
              }))
            }}
          >
            <Tooltip title={autoAssignTip(candidates[0])}>
              <Button
                icon={<ThunderboltOutlined />}
                block={stackButtons}
                loading={pullLoading}
                disabled={loading}
              >
                Auto-Assign <DownOutlined />
              </Button>
            </Tooltip>
          </Dropdown>
        ) : (
          <Tooltip title={autoAssignTip(candidates[0])}>
            <Button
              onClick={() => candidates[0] && pullFrom(candidates[0])}
              icon={<ThunderboltOutlined />}
              block={stackButtons}
              loading={pullLoading}
              disabled={loading || pullLoading || candidates.length === 0}
            >
              Auto-Assign
            </Button>
          </Tooltip>
        )}
        <Tooltip
          title={
            saveBlockedReason ??
            (emptySlotCount > 0
              ? `Save now - ${emptySlotCount} empty slot${
                  emptySlotCount === 1 ? '' : 's'
                } will be left unassigned.`
              : 'Save the alliance selections for this tournament.')
          }
        >
          <Button
            type='primary'
            icon={<SaveOutlined />}
            block={stackButtons}
            loading={loading}
            onClick={saveAlliances}
            disabled={loading || !!saveBlockedReason}
          >
            Save Alliances
          </Button>
        </Tooltip>
      </Flex>
      {saveBlockedReason && (
        <Typography.Paragraph
          type='danger'
          style={{
            marginTop: '0.5rem',
            marginBottom: 0,
            textAlign: stackButtons ? 'left' : 'right'
          }}
        >
          {saveBlockedReason}
        </Typography.Paragraph>
      )}
    </>
  );
};
