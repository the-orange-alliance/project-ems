import { Button } from '@mui/material';
import { FC } from 'react';
import { useMatchControl } from '../hooks/use-match-control';
import { usePostResultsCallback } from '../hooks/use-post-results';

export const PostResultsButton: FC = () => {
  const { canPostResults } = useMatchControl();
  const postResults = usePostResultsCallback();
  return (
    <Button
      fullWidth
      color='success'
      variant='contained'
      onClick={postResults}
      disabled={!canPostResults}
    >
      Post Results
    </Button>
  );
};
