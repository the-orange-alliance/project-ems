import { FC, useEffect } from 'react';
import { useRecoilState } from 'recoil';
import { useSearchParams } from 'react-router-dom';
import { useSocket } from 'src/api/SocketProvider';
import MatchCountdown from 'src/features/components/MatchCountdown/MatchCountdown';
import { matchInProgress, timer } from 'src/stores/Recoil';
import './MatchPlayMini.css';
import { Match, MatchSocketEvent } from '@toa-lib/models';
import {
  initAudio,
  MATCH_START,
  MATCH_ABORT,
  MATCH_ENDGAME,
  MATCH_END
} from 'src/apps/AudienceDisplay/Audio';

import FGC_LOGO from '../res/Global_Logo.png';

const startAudio = initAudio(MATCH_START);
const abortAudio = initAudio(MATCH_ABORT);
const endgameAudio = initAudio(MATCH_ENDGAME);
const endAudio = initAudio(MATCH_END);

const MatchPlayMini: FC = () => {
  const [match, setMatch] = useRecoilState(matchInProgress);
  const [socket, connected] = useSocket();
  const [searchParams] = useSearchParams();
  const position = searchParams.get('position');

  useEffect(() => {
    if (connected) {
      socket?.on(MatchSocketEvent.START, matchStart);
      socket?.on(MatchSocketEvent.ABORT, matchAbort);
      socket?.on(MatchSocketEvent.ENDGAME, matchEndGame);
      socket?.on(MatchSocketEvent.END, matchEnd);
      socket?.on(MatchSocketEvent.UPDATE, matchUpdate);
    }
  }, [connected]);

  useEffect(() => {
    return () => {
      socket?.removeListener(MatchSocketEvent.START, matchStart);
      socket?.removeListener(MatchSocketEvent.ABORT, matchAbort);
      socket?.removeListener(MatchSocketEvent.ENDGAME, matchEndGame);
      socket?.removeListener(MatchSocketEvent.END, matchEnd);
      socket?.removeListener(MatchSocketEvent.UPDATE, matchUpdate);
    };
  }, []);

  const matchStart = () => {
    startAudio.play();
  };

  const matchAbort = () => {
    abortAudio.play();
  };

  const matchEndGame = () => {
    endgameAudio.play();
  };

  const matchEnd = () => {
    endAudio.play();
  };

  const matchUpdate = (newMatch: Match) => {
    if (timer.inProgress()) {
      setMatch(newMatch);
    }
  };

  const getClass = () => {
    if (!position) return '';
    if (position === 'top-left') {
      return 'mini-top-left';
    } else if (position === 'top-right') {
      return 'mini-top-right';
    } else if (position === 'bot-left') {
      return 'mini-bot-left';
    } else if (position === 'bot-right') {
      return 'mini-bot-right';
    } else if (position === 'bot-center') {
      return 'mini-bot-center';
    } else if (position === 'top-center') {
      return 'mini-top-center';
    }
  };

  return (
    <div>
      <div id='mini-play-display-center' className={getClass()}>
        <div id='mini-score-container-header'>
          <img alt={'fgc logo'} src={FGC_LOGO} className='fit-w' />
        </div>

        <div id='mini-score-container-scores'>
          <div id='mini-score-container-red'>
            <div className='red-bg center'>
              <span>{match?.redScore}</span>
            </div>
          </div>
          <div id='mini-score-container-blue'>
            <div className='blue-bg center'>
              <span>{match?.blueScore}</span>
            </div>
          </div>
        </div>

        <div id='mini-score-container-timer'>
          <span>
            <MatchCountdown />
          </span>
        </div>
      </div>
    </div>
  );
};

export default MatchPlayMini;
