import { FC, useState } from 'react';
import { useMatchControl } from '../hooks/use-match-control.js';
import { usePrepareFieldCallback } from '../hooks/use-prepare-field.js';
import { useSnackbar } from 'src/hooks/use-snackbar.js';
import { Button } from 'antd';
import { ToolOutlined } from '@ant-design/icons';

export const FieldPrepButton: FC = () => {
  const [loading, setLoading] = useState(false);
  const { canPrepField } = useMatchControl();
  const prepareField = usePrepareFieldCallback();
  const { showErrorSnackbar } = useSnackbar();
  const sendPrepareField = async () => {
    setLoading(true);
    try {
      await prepareField();
      setLoading(false);
    } catch (e) {
      showErrorSnackbar('Error while prestarting.', e);
      setLoading(false);
    }
  };
  return (
    <Button
      color='orange'
      variant='solid'
      size='large'
      block
      icon={<ToolOutlined />}
      onClick={sendPrepareField}
      disabled={!canPrepField || loading}
      loading={loading}
    >
      Prep Field
    </Button>
  );
};
