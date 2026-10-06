import { CodeOutlined } from '@ant-design/icons';
import { Tag, Tooltip } from 'antd';
import { FC } from 'react';

export const VersionChip: FC<{ iconOnly?: boolean }> = ({ iconOnly }) => {
  const gitSha = import.meta.env.VITE_GIT_SHA ?? 'LOCAL';
  const chip = (
    <Tag
      icon={<CodeOutlined />}
      color='gold'
      style={{ fontSize: 'large', padding: '8px', marginInlineEnd: 0 }}
    >
      {!iconOnly && gitSha}
    </Tag>
  );
  return iconOnly ? <Tooltip title={gitSha}>{chip}</Tooltip> : chip;
};
