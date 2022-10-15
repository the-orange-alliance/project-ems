import { FC } from 'react';
import Button from '@mui/material/Button';
import { useButtonState } from '../../util/ButtonState';
import { setDisplays } from 'src/api/SocketProvider';
import { useSetRecoilState } from 'recoil';
import { matchStateAtom } from 'src/stores/Recoil';
import { MatchState } from '@toa-lib/models';

const AudienceDisplayButton: FC = () => {
  const { audienceDisplayEnabled } = useButtonState();
  const setState = useSetRecoilState(matchStateAtom);

  const updateDisplays = () => {
    setDisplays();
    setState(MatchState.AUDIENCE_READY);
  };

  return (
    <Button
      disabled={!audienceDisplayEnabled}
      color='info'
      fullWidth
      variant='contained'
      onClick={updateDisplays}
    >
      Set Displays
    </Button>
  );
};

export default AudienceDisplayButton;
