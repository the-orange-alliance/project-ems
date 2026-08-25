import { Button } from 'antd';
import { FC } from 'react';
import { useMatchControl } from '../hooks/use-match-control.js';
import { MatchState, WebhookEvent } from '@toa-lib/models';
import { useSocketWorker } from 'src/api/use-socket-worker.js';
import { matchAtom } from 'src/stores/state/index.js';
import { useAtomValue } from 'jotai';
import { emitWebhook } from 'src/api/use-webhook-data.js';
import { Displays } from '@toa-lib/models/base';

export const DisplaysButton: FC = () => {
  const { canSetDisplays, setState } = useMatchControl();
  const match = useAtomValue(matchAtom);
  const { events } = useSocketWorker();
  const updateDisplays = () => {
    events.display(Displays.MATCH_START);
    setState(MatchState.AUDIENCE_READY);
    emitWebhook(WebhookEvent.DISPLAYS_SET, match);
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
