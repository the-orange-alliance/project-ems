import { FC, useState } from 'react';
import LoadingButton from '@mui/lab/LoadingButton';
import { useButtonState } from '../../util/ButtonState';
import { useSetRecoilState } from 'recoil';
import { matchStateAtom } from 'src/stores/Recoil';
import { MatchState } from '@toa-lib/models';
import { sendPrepareField } from 'src/api/SocketProvider';

const StupidButton: FC = () => {
  const setState = useSetRecoilState(matchStateAtom);

  const { fieldDumpEnabled } = useButtonState();

  const [loading, setLoading] = useState(false);

  const updateField = async () => {
    setLoading(true);
    sendPrepareField();
    setState(MatchState.MATCH_READY);
    setLoading(false);
  };

  return (
    <LoadingButton
      disabled={!fieldDumpEnabled}
      color='success'
      fullWidth
      variant='contained'
      onClick={loading ? undefined : updateField}
      loading={loading}
    >
      DUMP
    </LoadingButton>
  );
};

export default StupidButton;
