import { Match, MatchParticipant } from '@toa-lib/models';
import { FC, useEffect } from 'react';
import { useRecoilCallback, useRecoilState, useRecoilValue } from 'recoil';
import MatchCountdown from 'src/features/components/MatchCountdown/MatchCountdown';
import { matchInProgressAtom, selectedMatchKeyAtom } from 'src/stores/Recoil';
import './MatchPlay.less';
import { useSocket } from 'src/api/SocketProvider';
import {
  initAudio,
  MATCH_ABORT,
  MATCH_END,
  MATCH_ENDGAME,
  MATCH_START
} from 'src/apps/AudienceDisplay/Audio';

import FGC_LOGO from '../res/Global_Logo.png';
import NO_CARD from '../res/Penalty_Blank.png';
import YELLOW_CARD from '../res/Penalty_Yellow_Dot.png';
import RED_CARD from '../res/Penalty_Red_Dot.png';

const startAudio = initAudio(MATCH_START);
const abortAudio = initAudio(MATCH_ABORT);
const endgameAudio = initAudio(MATCH_ENDGAME);
const endAudio = initAudio(MATCH_END);

const RedParticipant: FC<{ participant: MatchParticipant }> = ({
  participant
}) => {
  return (
    <div className='team'>
      <CardStatus status={participant.cardStatus} />
      <div className='team-name-left'>
        <span>{participant.teamKey}</span>
      </div>
      <div className='team-flag'>
        <span className={'flag-icon flag-icon-az'} />
      </div>
    </div>
  );
};

const BlueParticipant: FC<{ participant: MatchParticipant }> = ({
  participant
}) => {
  return (
    <div className='team'>
      <div className='team-flag'>
        <span className={'flag-icon flag-icon-au'} />
      </div>
      <div className='team-name-right'>
        <span>{participant.teamKey}</span>
      </div>
      <CardStatus status={participant.cardStatus} />
    </div>
  );
};

const CardStatus: FC<{ status: number }> = ({ status }) => {
  const getCardImage = (cardStatus: number) => {
    switch (cardStatus) {
      case 0:
        return NO_CARD;
      case 1:
        return YELLOW_CARD;
      case 2:
        return RED_CARD;
      default:
        return NO_CARD;
    }
  };

  return (
    <div className='team-card'>
      <div className='card-container'>
        <img
          alt={'team card status'}
          src={getCardImage(status)}
          className='fit-h'
        />
      </div>
    </div>
  );
};

const MatchPlay: FC = () => {
  const matchKey = useRecoilValue(selectedMatchKeyAtom);
  const [match, setMatch] = useRecoilState(matchInProgressAtom(matchKey || ''));
  const [socket, connected] = useSocket();

  const redAlliance = match?.participants?.filter((p) => p.station < 20);
  const blueAlliance = match?.participants?.filter((p) => p.station >= 20);

  useEffect(() => {
    if (connected) {
      socket?.on('match:start', matchStart);
      socket?.on('match:abort', matchAbort);
      socket?.on('match:endgame', matchEndGame);
      socket?.on('match:end', matchEnd);
      socket?.on('match:update', matchUpdate);
    }
  }, [connected]);

  useEffect(() => {
    socket?.removeListener('match:start', matchStart);
    socket?.removeListener('match:abort', matchAbort);
    socket?.removeListener('match:endgame', matchEndGame);
    socket?.removeListener('match:end', matchEnd);
    socket?.removeListener('match:update', matchUpdate);
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

  const matchUpdate = useRecoilCallback(
    ({ snapshot, set }) =>
      async (newMatch: Match) => {
        const key = await snapshot.getPromise(selectedMatchKeyAtom);
        set(matchInProgressAtom(key || ''), newMatch);
      }
  );

  return (
    <div>
      <div id='play-display-base'>
        <div id='play-display-base-top'>
          <div id='play-display-left-score'>
            <div className='teams red-bg left-score'>
              {redAlliance?.map((p) => (
                <RedParticipant key={p.matchParticipantKey} participant={p} />
              ))}
            </div>
          </div>
          <div id='play-display-center'>
            <div id='score-container-header'>
              <img alt={'fgc logo'} src={FGC_LOGO} className='fit-w' />
            </div>
            <div id='score-container-timer'>
              <span>
                <MatchCountdown />
              </span>
            </div>
            <div id='score-container-scores'>
              <div id='score-container-red'>
                <div className='red-bg center'>
                  <span>{match?.redScore || 0}</span>
                </div>
              </div>
              <div id='score-container-blue'>
                <div className='blue-bg center'>
                  <span>{match?.blueScore || 0}</span>
                </div>
              </div>
            </div>
          </div>
          <div id='play-display-right-score'>
            <div className='teams blue-bg right-score'>
              {blueAlliance?.map((p) => (
                <BlueParticipant key={p.matchParticipantKey} participant={p} />
              ))}
            </div>
          </div>
        </div>
        <div id='play-display-base-bottom'>
          <div className='info-col'>
            <span className='info-field'>MATCH: {match?.matchName}</span>
          </div>
          <div className='info-col'>
            <span className='info-field'>FIRST Global 2022</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatchPlay;
