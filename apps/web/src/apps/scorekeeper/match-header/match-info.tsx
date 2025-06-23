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

export const MatchInfo: FC = () => {
  const matchState = useAtomValue(matchStatusAtom);
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
        style={{ alignSelf: 'center', marginTop: 8 }}
      >
        {connected ? 'Connected' : 'Not Connected'}
      </Tag>
    </Card>
  );
};
