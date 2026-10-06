import { CodeOutlined } from '@ant-design/icons';
import { Tag, Tooltip } from 'antd';
import { FC } from 'react';

export const VersionChip: FC<{ iconOnly?: boolean }> = ({ iconOnly }) => {
  const appVersion = import.meta.env.APP_VERSION ?? 'LOCAL';
  const chip = (
    <Tag
      icon={<CodeOutlined />}
      color='gold'
      style={{ fontSize: 'large', padding: '8px', marginInlineEnd: 0 }}
    >
      {!iconOnly && `v${appVersion}`}
    </Tag>
  );
  return iconOnly ? <Tooltip title={appVersion}>{chip}</Tooltip> : chip;
};
