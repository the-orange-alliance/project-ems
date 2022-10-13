import { FC, useState } from 'react';
import LoadingButton from '@mui/lab/LoadingButton';
import { useButtonState } from '../../util/ButtonState';
import { useRecoilValue, useSetRecoilState } from 'recoil';
import { fieldMotorDuration, matchStateAtom } from 'src/stores/Recoil';
import { MatchState } from '@toa-lib/models';
import { dump } from 'src/api/SocketProvider';

const StupidButton: FC = () => {
  const setState = useSetRecoilState(matchStateAtom);
  const duration = useRecoilValue(fieldMotorDuration);

  const { fieldDumpEnabled } = useButtonState();

  const [loading, setLoading] = useState(false);

  const updateField = async () => {
    setLoading(true);
    await dump(duration);
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
