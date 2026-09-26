import {
  getDefaultMatchDetailsBySeasonKey,
  getFunctionsBySeasonKey,
  getSeasonKeyFromEventKey,
  IgnitingInnovation,
  Match
} from '@toa-lib/models';
import { Button, Card, Col, Row, Typography } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { FC, useState } from 'react';
import { useAtomValue } from 'jotai';
import { DefaultLayout } from '../../layouts/default-layout.js';
import { eventKeyAtom } from '../../stores/state/event.js';
import { useComponents } from 'src/seasons/index.js';

const { Text } = Typography;
const { IgnitingInnovationSeason } = IgnitingInnovation;

type Details = IgnitingInnovation.MatchDetails;

// calculateScore reads fouls off the top-level Match object, not `details` -
// route these keys there instead of merging them into details like every
// other score element.
const PENALTY_KEYS = [
  'redMinPen',
  'redMajPen',
  'blueMinPen',
  'blueMajPen'
] as const;
type PenaltyKey = (typeof PENALTY_KEYS)[number];

const isPenaltyKey = (key: unknown): key is PenaltyKey =>
  typeof key === 'string' && (PENALTY_KEYS as readonly string[]).includes(key);

const createScratchMatch = (seasonKey: string): Match<Details> => ({
  eventKey: 'score-calculator',
  tournamentKey: 'test',
  id: 0,
  name: 'Score Calculator Test',
  scheduledTime: '',
  prestartTime: '',
  actualStartTime: '',
  fieldNumber: 1,
  cycleTime: 0,
  redScore: 0,
  redMinPen: 0,
  redMajPen: 0,
  blueScore: 0,
  blueMinPen: 0,
  blueMajPen: 0,
  active: 0,
  result: -1,
  uploaded: 0,
  details: getDefaultMatchDetailsBySeasonKey<Details>(seasonKey)
});

export const ScoreCalculator: FC = () => {
  const eventKey = useAtomValue(eventKeyAtom);
  const seasonKey = getSeasonKeyFromEventKey(eventKey ?? '');
  const supported = seasonKey === IgnitingInnovationSeason.key;

  const functions = supported
    ? getFunctionsBySeasonKey<Details, any>(seasonKey)
    : undefined;
  const components = useComponents<Details, any>(
    supported ? seasonKey : undefined
  );

  const [match, setMatch] = useState<Match<Details>>(() =>
    createScratchMatch(seasonKey)
  );

  const handleReset = () => setMatch(createScratchMatch(seasonKey));

  const handleUpdates = (key: any, value: any) => {
    if (!functions) return;
    setMatch((prev) => {
      let next: Match<Details> = isPenaltyKey(key)
        ? { ...prev, [key]: value }
        : { ...prev, details: { ...prev.details, [key]: value } as Details };

      if (functions.calculateRankingPoints && next.details) {
        next = { ...next, details: functions.calculateRankingPoints(next.details) };
      }
      const [redScore, blueScore] = functions.calculateScore(next);
      return { ...next, redScore, blueScore };
    });
  };

  if (!supported || !functions || !components) {
    return (
      <DefaultLayout title='Score Calculator'>
        <Card>
          <Text>
            Score Calculator currently only supports the 2026 season
            (Igniting Innovation). Load a 2026 event to use this tool.
          </Text>
        </Card>
      </DefaultLayout>
    );
  }

  return (
    <DefaultLayout title='Score Calculator'>
      <>
        <Card
          style={{ marginBottom: 16 }}
          title={`${IgnitingInnovationSeason.name} — Manual Score Calculator`}
          extra={
            <Button icon={<ReloadOutlined />} onClick={handleReset}>
              Reset
            </Button>
          }
        >
          <Row gutter={16} justify='center' align='middle'>
            <Col>
              <Text strong style={{ color: '#ff4d4f', fontSize: 40 }}>
                {match.redScore}
              </Text>
            </Col>
            <Col>
              <Text strong style={{ fontSize: 32 }}>
                –
              </Text>
            </Col>
            <Col>
              <Text strong style={{ color: '#1890ff', fontSize: 40 }}>
                {match.blueScore}
              </Text>
            </Col>
          </Row>
        </Card>

        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            {components.RedScoreBreakdown && (
              <components.RedScoreBreakdown
                match={match}
                handleUpdates={handleUpdates}
              />
            )}
          </Col>
          <Col xs={24} lg={12}>
            {components.BlueScoreBreakdown && (
              <components.BlueScoreBreakdown
                match={match}
                handleUpdates={handleUpdates}
              />
            )}
          </Col>
        </Row>

        {components.CustomBreakdown && (
          <components.CustomBreakdown
            match={match}
            handleUpdates={handleUpdates}
          />
        )}
      </>
    </DefaultLayout>
  );
};
