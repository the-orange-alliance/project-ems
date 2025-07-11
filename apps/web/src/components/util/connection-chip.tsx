import { FC } from 'react';
import { useSocket } from 'src/api/use-socket.js';
import { Tag } from 'antd';
import {
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  WarningOutlined
} from '@ant-design/icons';
import { useAtomValue } from 'jotai';
import { userAtom } from 'src/stores/state/ui.js';

export const ConnectionChip: FC = () => {
  const [, connected] = useSocket();
  const user = useAtomValue(userAtom);

  return (
    <Tag
      icon={
        connected && user ? (
          <CheckCircleOutlined />
        ) : connected && !user ? (
          <WarningOutlined />
        ) : (
          <ExclamationCircleOutlined />
        )
      }
      color={
        user && connected ? 'success' : connected && !user ? 'warning' : 'error'
      }
      style={{
        fontSize: 'large',
        padding: '8px'
      }}
    >
      {connected && user
        ? 'Socket Connected'
        : !user
          ? 'Please Login'
          : 'Socket Not Connected'}
    </Tag>
  );
};
