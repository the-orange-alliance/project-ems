import { FC, useState } from 'react';
import { useMatchControl } from '../hooks/use-match-control';
import { usePrepareFieldCallback } from '../hooks/use-prepare-field';
import { useSnackbar } from 'src/hooks/use-snackbar';
import { LoadingButton } from '@mui/lab';

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
    <LoadingButton
      fullWidth
      color='success'
      variant='contained'
      onClick={sendPrepareField}
      disabled={!canPrepField || loading}
      loading={loading}
    >
      Prep Field
    </LoadingButton>
  );
};
