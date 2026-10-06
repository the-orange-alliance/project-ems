import { UsergroupAddOutlined } from '@ant-design/icons';
import { Tag, Tooltip } from 'antd';
import { FC } from 'react';
import { getFromLocalStorage } from 'src/stores/local-storage.js';

export const MetadataChips: FC = () => {
  const isFollowerMode = getFromLocalStorage('leaderApiEnabled', false);
  const leaderApiHost = getFromLocalStorage('leaderApiHost', false);
  return (
    <>
      {isFollowerMode && (
        <Tooltip title={leaderApiHost}>
          <Tag
            icon={<UsergroupAddOutlined />}
            color='purple'
            style={{ fontSize: 'large', padding: '8px' }}
          >
            Follower
          </Tag>
        </Tooltip>
      )}
    </>
  );
};
