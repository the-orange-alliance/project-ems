import { FC, useState } from 'react';
import LoadingButton from '@mui/lab/LoadingButton';
import { useButtonState } from '../../util/ButtonState';
import { useSetRecoilState, useRecoilValue } from 'recoil';
import { matchStateAtom } from 'src/stores/NewRecoil';
import { FcsPackets, FieldOptions, MatchState } from '@toa-lib/models';
import { sendPrepareField } from 'src/api/SocketProvider';
import {
  fcsPacketsSelector,
  fieldOptionsSelector
} from '@seasons/HydrogenHorizons/stores/Recoil';

const FieldPrepButton: FC = () => {
  const setState = useSetRecoilState(matchStateAtom);
  const fieldOptions: FieldOptions = useRecoilValue(fieldOptionsSelector);
  const fcsPackets: FcsPackets = useRecoilValue(fcsPacketsSelector);

  const { fieldPrepEnabled } = useButtonState();

  const [loading, setLoading] = useState(false);

  const updateField = async () => {
    setLoading(true);
    sendPrepareField(fieldOptions, fcsPackets);
    setState(MatchState.MATCH_READY);
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
      Prep Field
    </LoadingButton>
  );
};

export default FieldPrepButton;
