import { Card, Typography, Tag } from 'antd';
import { FC } from 'react';
import {
  ExclamationCircleOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { MatchTimer } from 'src/components/util/match-timer.js';
import { useSocket } from 'src/api/use-socket.js';
import { useAtomValue } from 'jotai';
import { matchStatusAtom } from 'src/stores/state/match.js';
import { isAudioEnabledForScorekeeper } from 'src/stores/state/ui.js';
import { matchAtom } from 'src/stores/state/index.js';

export const MatchInfo: FC = () => {
  const matchState = useAtomValue(matchStatusAtom);
  const match = useAtomValue(matchAtom);
  const audioEnabled = useAtomValue(isAudioEnabledForScorekeeper);
  const [, connected] = useSocket();
  return (
    <Card
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16
      }}
    >
      <Typography.Title style={{textAlign: 'center'}} level={4}>
        {match ? match.name : 'No Match Selected'}
      </Typography.Title>
      <Typography.Title
        level={3}
        style={{ textAlign: 'center', marginBottom: 8 }}
      >
        <MatchTimer audio={audioEnabled} />
      </Typography.Title>
      <Typography.Text
        style={{ display: 'block', textAlign: 'center', marginBottom: 8 }}
      >
        {matchState}
      </Typography.Text>
      <Tag
        icon={
          connected ? <CheckCircleOutlined /> : <ExclamationCircleOutlined />
        }
        color={connected ? 'success' : 'error'}
        style={{ alignSelf: 'center', marginTop: 8, width: '100%', textAlign: 'center' }}
      >
        {connected ? 'Connected' : 'Not Connected'}
      </Tag>
    </Card>
  );
};
