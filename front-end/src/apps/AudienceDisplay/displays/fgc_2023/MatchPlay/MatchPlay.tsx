import { HydrogenHorizons, Match, MatchParticipant } from '@toa-lib/models';
import { FC, useEffect } from 'react';
import { useRecoilState } from 'recoil';
import MatchCountdown from 'src/features/components/MatchCountdown/MatchCountdown';
import { matchInProgressAtom, timer } from 'src/stores/NewRecoil';
import './MatchPlay.less';
import { useSocket } from 'src/api/SocketProvider';
import { useSearchParams } from 'react-router-dom';
import FGC_LOGO from '../res/Global_Logo.png';
import RED_CARD from '../res/Penalty_Red_Dot.png';
import YELLOW_CARD from '../res/Penalty_Yellow_Dot.png';

function getName(name: string): string {
  const params = name.split(' ');
  if (params.length <= 1) return name;
  return params.length === 3 ? params[2] : `${name.charAt(0)}${params[3]}`;
}

const LeftParticipant: FC<{ participant: MatchParticipant }> = ({
  participant
}) => {
  return (
    <div className='team'>
      <CardStatus cardStatus={participant.cardStatus} />
      <div className='team-name-left-p'>
        <span>{participant.team?.countryCode}</span>
      </div>
      <div className='team-flag'>
        <span
          className={
            'flag-icon flag-icon-' + participant.team?.countryCode.toLowerCase()
          }
        />
      </div>
    </div>
  );
};

const RightParticipant: FC<{
  participant: MatchParticipant;
}> = ({ participant }) => {
  return (
    <div className='team'>
      <div className='team-flag'>
        <span
          className={
            'flag-icon flag-icon-' +
            participant?.team?.countryCode.toLocaleLowerCase()
          }
        />
      </div>
      <div className='team-name-right-p'>
        <span>{participant.team?.country}</span>
      </div>
      <CardStatus cardStatus={participant.cardStatus} />
    </div>
  );
};

const CardStatus: FC<{ cardStatus: number }> = ({ cardStatus }) => {
  console.log({ cardStatus });
  const getImg = () => {
    switch (cardStatus) {
      case 0:
        return '';
      case 1:
        return YELLOW_CARD;
      case 2:
        return RED_CARD;
      default:
        return '';
    }
  };
  return (
    <div className='team-card-status'>
      <img src={getImg()} className='fit-h' />
    </div>
  );
};

const MatchPlay: FC = () => {
  const [match, setMatch] = useRecoilState(matchInProgressAtom);
  const [socket, connected] = useSocket();
  const [searchParams] = useSearchParams();
  const flip = searchParams.get('flip') === 'true';

  const redAlliance = match?.participants
    ?.filter((p) => p.station < 20)
    .slice(0, 3);
  const blueAlliance = match?.participants
    ?.filter((p) => p.station >= 20)
    .slice(0, 3);

  const name = getName(match ? match.name : '');

  useEffect(() => {
    if (connected) {
      socket?.on('match:update', matchUpdate);
    }
  }, [connected]);

  useEffect(() => {
    return () => {
      socket?.removeListener('match:update', matchUpdate);
    };
  }, []);

  const matchUpdate = (newMatch: Match<HydrogenHorizons.MatchDetails>) => {
    if (timer.inProgress()) {
      setMatch(newMatch);
    }
  };

  return (
    <div>
      <div id='play-display-base'>
        <div id='play-display-base-top'>
          <div id='play-display-left-score'>
            <div className={`teams left-score ${flip ? 'blue-bg' : 'red-bg'}`}>
              {(flip ? blueAlliance : redAlliance)?.map((p) => (
                <LeftParticipant
                  key={`${p.eventKey}-${p.tournamentKey}-${p.teamKey}`}
                  participant={p}
                />
              ))}
            </div>
          </div>
          <div id='play-display-center'>
            <div id='score-container-header'>
              <img alt={'fgc logo'} src={FGC_LOGO} className='fit-w' />
            </div>
            <div id='score-container-timer'>
              <span>
                <MatchCountdown audio />
              </span>
            </div>
            <div id='score-container-scores'>
              {!flip && (
                <div id='score-container-red'>
                  <div className='red-bg center'>
                    <span>{match?.redScore || 0}</span>
                  </div>
                </div>
              )}
              {flip && (
                <div id='score-container-blue'>
                  <div className='blue-bg center'>
                    <span>{match?.blueScore || 0}</span>
                  </div>
                </div>
              )}
              {flip && (
                <div id='score-container-red'>
                  <div className='red-bg center'>
                    <span>{match?.redScore || 0}</span>
                  </div>
                </div>
              )}
              {!flip && (
                <div id='score-container-blue'>
                  <div className='blue-bg center'>
                    <span>{match?.blueScore || 0}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div id='play-display-right-score'>
            <div className={`teams right-score ${flip ? 'red-bg' : 'blue-bg'}`}>
              {(flip ? redAlliance : blueAlliance)?.map((p) => (
                <RightParticipant
                  key={`${p.eventKey}-${p.tournamentKey}-${p.teamKey}`}
                  participant={p}
                />
              ))}
            </div>
          </div>
        </div>
        <div id='play-display-base-bottom'>
          <div className='info-col'>
            <span className='info-field'>MATCH: {name}</span>
          </div>
          <div className='info-col'>
            <span className='info-field'>FIRST Global 2023</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatchPlay;
