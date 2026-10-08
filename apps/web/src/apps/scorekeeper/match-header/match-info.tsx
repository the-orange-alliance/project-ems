import { Badge, Card, Flex, Typography } from 'antd';
import { FC } from 'react';
import { Alliance } from '@toa-lib/models';
import { MatchTimer } from 'src/components/util/match-timer.js';
import { FieldConnectionBadge } from 'src/components/util/field-connection-badge.js';
import { ScheduleStatusChip } from 'src/components/util/schedule-status-chip.js';
import { useSocketWorker } from 'src/api/use-socket-worker.js';
import { useAtomValue } from 'jotai';
import { matchStatusAtom } from 'src/stores/state/match.js';
import { isAudioEnabledForScorekeeper } from 'src/stores/state/ui.js';
import { matchAtom } from 'src/stores/state/index.js';
import { useAlliancePalette } from './alliances.js';
import { useFieldConnection } from '../hooks/use-field-connection.js';

const ScoreTile: FC<{ alliance: Alliance; score?: number }> = ({
  alliance,
  score
}) => {
  const palette = useAlliancePalette(alliance);
  return (
    <Flex
      flex={1}
      vertical
      align='center'
      style={{
        padding: '2px 0',
        border: `1px solid ${palette.border}`,
        borderTop: `3px solid ${palette.accent}`,
        background: palette.tile
      }}
    >
      <Typography.Text
        style={{
          fontSize: 28,
          fontWeight: 700,
          lineHeight: 1.2,
          fontVariantNumeric: 'tabular-nums'
        }}
      >
        {score ?? '--'}
      </Typography.Text>
    </Flex>
  );
};

const ScorekeeperFieldBadge: FC = () => (
  <FieldConnectionBadge status={useFieldConnection()} />
);

export const MatchInfo: FC = () => {
  const matchState = useAtomValue(matchStatusAtom);
  const match = useAtomValue(matchAtom);
  const audioEnabled = useAtomValue(isAudioEnabledForScorekeeper);
  const { connected } = useSocketWorker();
  return (
    <Card
      style={{ height: '100%' }}
      styles={{
        body: {
          height: '100%',
          padding: 12,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          textAlign: 'center'
        }
      }}
    >
      <Typography.Text strong>
        {match ? match.name : 'No Match Selected'}
      </Typography.Text>
      <Typography.Text
        style={{
          fontSize: 40,
          fontWeight: 600,
          lineHeight: 1.1,
          fontVariantNumeric: 'tabular-nums'
        }}
      >
        <MatchTimer audio={audioEnabled} />
      </Typography.Text>
      <Typography.Text type='secondary' style={{ fontSize: 12 }}>
        {matchState}
      </Typography.Text>
      <Flex gap={8} style={{ width: '100%', margin: '4px 0' }}>
        <ScoreTile alliance='red' score={match?.redScore} />
        <ScoreTile alliance='blue' score={match?.blueScore} />
      </Flex>
      <Flex gap={8} align='center' justify='center' wrap>
        <Badge
          status={connected ? 'success' : 'error'}
          text={connected ? 'Connected' : 'Not Connected'}
        />
        <ScorekeeperFieldBadge />
        <ScheduleStatusChip small />
      </Flex>
    </Card>
  );
};
