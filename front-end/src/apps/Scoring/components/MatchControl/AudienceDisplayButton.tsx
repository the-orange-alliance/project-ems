import { FC } from 'react';
import Button from '@mui/material/Button';
import { useButtonState } from '../../util/ButtonState';
import { useSetRecoilState } from 'recoil';
import { matchStateAtom } from 'src/stores/NewRecoil';
import { MatchState } from '@toa-lib/models';
import { useSetDisplaysCallback } from '../../hooks/use-match-control';

const AudienceDisplayButton: FC = () => {
  const { audienceDisplayEnabled } = useButtonState();
  const setState = useSetRecoilState(matchStateAtom);

  const setDisplays = useSetDisplaysCallback();

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
