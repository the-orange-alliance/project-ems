import { FC, useState } from 'react';
import { useMatchControl } from '../hooks/use-match-control.js';
import { usePrepareFieldCallback } from '../hooks/use-prepare-field.js';
import { useSnackbar } from 'src/hooks/use-snackbar.js';
import { Button } from 'antd';

export const FieldPrepButton: FC = () => {
  const [loading, setLoading] = useState(false);
  const { canPrepField } = useMatchControl();
  const prepareField = usePrepareFieldCallback();
  const { showSnackbar } = useSnackbar();
  const sendPrepareField = async () => {
    setLoading(true);
    try {
      await prepareField();
      setLoading(false);
    } catch (e) {
      const error = e instanceof Error ? `${e.name} ${e.message}` : String(e);
      showSnackbar('Error while prestarting', error);
      setLoading(false);
    }
  };
  return (
    <Button
      type='primary'
      block
      onClick={sendPrepareField}
      disabled={!canPrepField || loading}
      loading={loading}
      style={{ backgroundColor: '#faad14', borderColor: '#faad14' }}
    >
      Prep Field
    </Button>
  );
};
