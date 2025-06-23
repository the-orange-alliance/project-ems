import { Button } from 'antd';
import { FC } from 'react';
import { useMatchControl } from '../hooks/use-match-control.js';
import { MatchState } from '@toa-lib/models';
import { setDisplays } from 'src/api/use-socket.js';

export const DisplaysButton: FC = () => {
  const { canSetDisplays, setState } = useMatchControl();
  const updateDisplays = () => {
    setDisplays();
    setState(MatchState.AUDIENCE_READY);
  };
  return (
    <Button
      type='primary'
      block
      onClick={updateDisplays}
      disabled={!canSetDisplays}
      style={{ backgroundColor: '#1890ff', borderColor: '#1890ff' }}
    >
      Set Displays
    </Button>
  );
};
