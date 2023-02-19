import { FC, useState } from 'react';
import LoadingButton from '@mui/lab/LoadingButton';
import { useButtonState } from '../../util/ButtonState';
import { useSetRecoilState } from 'recoil';
import { matchStateAtom } from 'src/stores/NewRecoil';
import { MatchState } from '@toa-lib/models';
import { sendPrepareField } from 'src/api/SocketProvider';

const FieldPrepButton: FC = () => {
  const setState = useSetRecoilState(matchStateAtom);

  const { fieldPrepEnabled } = useButtonState();

  const [loading, setLoading] = useState(false);

  const updateField = async () => {
    setLoading(true);
    sendPrepareField();
    setState(MatchState.FIELD_READY);
    setLoading(false);
  };

  return (
    <LoadingButton
      disabled={!fieldPrepEnabled}
      color='success'
      fullWidth
      variant='contained'
      onClick={loading ? undefined : updateField}
      loading={loading}
    >
      Prep
    </LoadingButton>
  );
};

export default FieldPrepButton;
