import { clientFetcher } from '@toa-lib/client';
import { Displays, isMatch, Match, MatchKey } from '@toa-lib/models';
import { FC, ReactNode, useEffect } from 'react';
import { useRecoilCallback, useRecoilState, useRecoilValue } from 'recoil';
import { useSocket } from 'src/api/SocketProvider';
import MatchStateListener from 'src/components/MatchStateListener/MatchStateListener';
import PrestartListener from 'src/components/PrestartListener/PrestartListener';
import ChromaLayout from 'src/layouts/ChromaLayout';
import {
  displayChromaKey,
  displayID,
  matchResultAtom
} from 'src/stores/NewRecoil';
import './AudienceDisplay.less';
import MatchPreview from './displays/frc_2023/MatchPreview/MatchPreview';

const AudienceDisplay: FC = () => {
  const [display, setDisplay] = useRecoilState(displayID);
  const chromaKey = useRecoilValue(displayChromaKey);
  const [socket, connected] = useSocket();

  useEffect(() => {
    if (connected) {
      socket?.on('match:display', onDisplay);
      socket?.on('match:commit', onCommit);
    }
  }, [connected]);

  useEffect(() => {
    return () => {
      socket?.removeListener('match:display', onDisplay);
      socket?.removeListener('match:commit', onCommit);
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
    default:
      return <div />;
  }
}
