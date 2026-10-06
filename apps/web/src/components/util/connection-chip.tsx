import { FC } from 'react';
import { useSocketWorker } from 'src/api/use-socket-worker.js';
import { Tag, Tooltip } from 'antd';
import {
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  WarningOutlined
} from '@ant-design/icons';
// import { useAtomValue } from 'jotai';
// import { userAtom } from 'src/stores/state/ui.js';

export const ConnectionChip: FC<{ iconOnly?: boolean }> = ({ iconOnly }) => {
  const { connected } = useSocketWorker();
  const user = true; //  useAtomValue(userAtom);
  const label =
    connected && user
      ? 'Connected'
      : !user
        ? 'Please Login'
        : 'Socket Not Connected';
  const chip = (
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
        padding: '8px',
        ...(iconOnly && { marginInlineEnd: 0 })
      }}
    >
      {!iconOnly && label}
    </Tag>
  );
  return iconOnly ? <Tooltip title={label}>{chip}</Tooltip> : chip;
};
