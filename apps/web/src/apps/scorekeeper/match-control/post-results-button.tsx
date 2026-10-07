import { Button } from 'antd';
import { CloudUploadOutlined } from '@ant-design/icons';
import { FC, useState } from 'react';
import { useMatchControl } from '../hooks/use-match-control.js';
import { usePostResultsCallback } from '../hooks/use-post-results.js';
import { useSnackbar } from 'src/hooks/use-snackbar.js';

export const PostResultsButton: FC = () => {
  const [loading, setLoading] = useState(false);
  const { canPostResults } = useMatchControl();
  const postResults = usePostResultsCallback();
  const { showErrorSnackbar } = useSnackbar();
  const sendPostResults = async () => {
    setLoading(true);
    try {
      await postResults();
    } catch (e) {
      showErrorSnackbar('Error while posting results.', e);
    } finally {
      setLoading(false);
    }
  };
  return (
    <Button
      color='green'
      variant='solid'
      size='large'
      block
      icon={<CloudUploadOutlined />}
      onClick={sendPostResults}
      disabled={!canPostResults || loading}
      loading={loading}
    >
      Post Results
    </Button>
  );
};
