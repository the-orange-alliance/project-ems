import { Tag } from 'antd';
import { FC } from 'react';

export const VersionChip: FC = () => {
  const gitSha = import.meta.env.VITE_GIT_SHA ?? 'local';
  return (
    <Tag color='gold' style={{ fontSize: 'large', padding: '8px' }}>
      {gitSha}
    </Tag>
  );
};
