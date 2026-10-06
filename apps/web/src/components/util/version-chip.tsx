import { CodeOutlined } from '@ant-design/icons';
import { Tag } from 'antd';
import { FC } from 'react';

export const VersionChip: FC = () => {
  const gitSha = import.meta.env.VITE_GIT_SHA ?? 'LOCAL';
  return (
    <Tag
      icon={<CodeOutlined />}
      color='gold'
      style={{ fontSize: 'large', padding: '8px' }}
    >
      {gitSha}
    </Tag>
  );
};
