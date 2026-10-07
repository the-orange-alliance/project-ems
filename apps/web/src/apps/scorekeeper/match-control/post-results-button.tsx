import { Button } from 'antd';
import { CloudUploadOutlined } from '@ant-design/icons';
import { FC } from 'react';
import { useMatchControl } from '../hooks/use-match-control.js';
import { usePostResultsCallback } from '../hooks/use-post-results.js';

export const PostResultsButton: FC = () => {
  const { canPostResults } = useMatchControl();
  const postResults = usePostResultsCallback();
  return (
    <Button
      color='green'
      variant='solid'
      size='large'
      block
      icon={<CloudUploadOutlined />}
      onClick={postResults}
      disabled={!canPostResults}
    >
      Post Results
    </Button>
  );
};
