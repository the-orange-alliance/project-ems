import { FC } from 'react';
import { Match } from '@toa-lib/models';
import { Tag } from 'antd';
import {
  CheckCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';

interface Props {
  match: Match<any> | null | undefined;
}

export const MatchChip: FC<Props> = ({ match }) => {
  return (
    <Tag
      icon={match ? <CheckCircleOutlined /> : <ExclamationCircleOutlined />}
      color={match ? 'success' : 'error'}
      style={{
        fontSize: 'large',
        padding: '8px'
      }}
    >
      {match ? match.name : 'No Match Loaded'}
    </Tag>
  );
};
