import { clientFetcher } from '@toa-lib/client';
import { Displays, isMatch, Match, MatchKey, MatchSocketEvent } from '@toa-lib/models';
import { FC, ReactNode, useEffect } from 'react';
import { useRecoilCallback, useRecoilState, useRecoilValue } from 'recoil';
import { useSocket } from 'src/api/SocketProvider';
import MatchStateListener from 'src/components/MatchStateListener/MatchStateListener';
import PrestartListener from 'src/components/PrestartListener/PrestartListener';
import ChromaLayout from 'src/layouts/ChromaLayout';
import {
  displayChromaKeyAtom,
  displayIdAtom,
  matchResultAtom
} from 'src/stores/NewRecoil';
import MatchPreview from './displays/frc_2023/MatchPreview/MatchPreview';
import MatchPlay from './displays/frc_2023/MatchPlay/MatchPlay';

import './AudienceDisplay.less';
import MatchResults from './displays/frc_2023/MatchResults/MatchResults';
import { useHiddenMotionlessCursor } from '@features/hooks/use-hidden-motionless-cursor';

const AudienceDisplay: FC = () => {
  const [display, setDisplay] = useRecoilState(displayIdAtom);
  const chromaKey = useRecoilValue(displayChromaKeyAtom);
  const [socket, connected] = useSocket();
  useHiddenMotionlessCursor();

  useEffect(() => {
    if (connected) {
      socket?.on(MatchSocketEvent.DISPLAY, onDisplay);
      socket?.on(MatchSocketEvent.COMMIT, onCommit);
    }
  }, [connected]);

  useEffect(() => {
    return () => {
      socket?.removeListener(MatchSocketEvent.DISPLAY, onDisplay);
      socket?.removeListener(MatchSocketEvent.COMMIT, onCommit);
    };
  }, [display]);

  const onDisplay = (id: number) => {
    setDisplay(id);
  };

  const onCommit = useRecoilCallback(({ set }) => async (key: MatchKey) => {
    const match: Match<any> = await clientFetcher(
      `match/all/${key.eventKey}/${key.tournamentKey}/${key.id}`,
      'GET',
      undefined,
      isMatch
    );
    set(matchResultAtom, match);
  });

  return (
    <ChromaLayout>
      <MatchStateListener />
      <PrestartListener />
      <div id='aud-base' style={{ backgroundColor: chromaKey }}>
        {getDisplay(display)}
      </div>
    </ChromaLayout>
  );
};

export default AudienceDisplay;

function getDisplay(id: number): ReactNode {
  switch (id) {
    case -1:
      return <div />;
    case Displays.MATCH_PREVIEW:
      return <MatchPreview />;
    case Displays.MATCH_START:
      return <MatchPlay />;
    case Displays.MATCH_RESULTS:
      return <MatchResults />;
    default:
      return <div />;
  }
}
