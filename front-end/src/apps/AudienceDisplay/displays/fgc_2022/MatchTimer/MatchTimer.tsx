import { FC, useEffect } from 'react';
import { useRecoilState } from 'recoil';
import { useSocket } from 'src/api/SocketProvider';
import MatchCountdown from 'src/features/components/MatchCountdown/MatchCountdown';
import { matchInProgress, timer } from 'src/stores/Recoil';
import { Match, MatchParticipant, MatchSocketEvent } from '@toa-lib/models';
import {
  initAudio,
  MATCH_START,
  MATCH_ABORT,
  MATCH_ENDGAME,
  MATCH_END
} from 'src/apps/AudienceDisplay/Audio';
import './MatchTimer.css';

import FGC_BG from '../res/global-bg.png';

const startAudio = initAudio(MATCH_START);
const abortAudio = initAudio(MATCH_ABORT);
const endgameAudio = initAudio(MATCH_ENDGAME);
const endAudio = initAudio(MATCH_END);

const RedParticipant: FC<{ participant: MatchParticipant }> = ({
  participant
}) => {
  return (
    <div className='team left-team'>
      <div className='team-name-left'>
        <span>{participant.team?.country}</span>
      </div>
      <div className='team-flag'>
        <span
          className={
            'flag-icon flag-icon-' +
            participant.team?.countryCode.toLocaleLowerCase()
          }
        />
      </div>
    </div>
  );
};

const BlueParticipant: FC<{ participant: MatchParticipant }> = ({
  participant
}) => {
  return (
    <div className='team right-team'>
      <div className='team-flag'>
        <span
          className={
            'flag-icon flag-icon-' + participant.team?.countryCode.toLowerCase()
          }
        />
      </div>
      <div className='team-name-right'>
        <span>{participant.team?.country}</span>
      </div>
    </div>
  );
};

const MatchTimer: FC = () => {
  const [match, setMatch] = useRecoilState(matchInProgress);
  const [socket, connected] = useSocket();

  const redAlliance = match?.participants?.filter((p) => p.station < 20);
  const blueAlliance = match?.participants?.filter((p) => p.station >= 20);

  const name = match?.matchName ? match.matchName.split(' ')[2] : '';

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

  return (
    <div id='fgc-body' style={{ backgroundImage: `url(${FGC_BG})` }}>
      <div id='timer-info'>
        <div id='timer-info-left'>
          <div className='timer-info-left center'>
            <span>MATCH</span>
          </div>
          <div className='timer-info-right center'>
            <span>{name}</span>
          </div>
        </div>
        <div id='timer-info-left'>
          <div className='timer-info-left center'>
            <span>FIELD</span>
          </div>
          <div className='timer-info-right center'>
            <span>{match?.fieldNumber}</span>
          </div>
        </div>
      </div>

      <div id={'fgc-timer-container'}>
        <div id={'fgc-timer-top'}>
          <div id={'fgc-timer-display'}>
            <span>
              <MatchCountdown />
            </span>
          </div>
        </div>
        <div id={'fgc-timer-bot'}>
          <div
            id={'fgc-timer-bot-left'}
            className={'teams-container teams-container-left'}
          >
            <div className={'teams red-bg'}>
              {redAlliance?.map((p) => (
                <RedParticipant key={p.matchParticipantKey} participant={p} />
              ))}
            </div>
          </div>
          <div id={'fgc-timer-bot-center'}>
            <div className={'timer-score timer-score-left red-bg'}>
              <span>{match?.redScore}</span>
            </div>
            <div className={'timer-score timer-score-right blue-bg'}>
              <span>{match?.blueScore}</span>
            </div>
          </div>
          <div
            id={'fgc-timer-bot-right'}
            className={'teams-container teams-container-right'}
          >
            <div className={'teams blue-bg'}>
              {blueAlliance?.map((p) => (
                <BlueParticipant key={p.matchParticipantKey} participant={p} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatchTimer;
