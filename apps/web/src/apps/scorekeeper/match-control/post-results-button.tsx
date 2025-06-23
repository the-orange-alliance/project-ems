import { Button } from 'antd';
import { FC } from 'react';
import { useMatchControl } from '../hooks/use-match-control.js';
import { usePostResultsCallback } from '../hooks/use-post-results.js';

export const PostResultsButton: FC = () => {
  const { canPostResults } = useMatchControl();
  const postResults = usePostResultsCallback();
  return (
    <Button
      type='primary'
      block
      onClick={postResults}
      disabled={!canPostResults}
      style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
    >
      Post Results
    </Button>
  );
};
