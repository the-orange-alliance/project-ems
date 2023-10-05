import { FC, useEffect } from 'react';
import { useRecoilState } from 'recoil';
import { useSocket } from 'src/api/SocketProvider';
import MatchCountdown from 'src/features/components/MatchCountdown/MatchCountdown';
import { matchInProgressAtom, timer } from 'src/stores/NewRecoil';
import {
  HydrogenHorizons,
  Match,
  MatchParticipant,
  MatchSocketEvent
} from '@toa-lib/models';
import './MatchTimer.css';

import FGC_BG from '../res/global-bg.png';

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

const MatchPlayTimer: FC = () => {
  const [match, setMatch] = useRecoilState(matchInProgressAtom);
  const [socket, connected] = useSocket();

  const redAlliance = match?.participants
    ?.filter((p) => p.station < 20)
    .slice(0, 3);
  const blueAlliance = match?.participants
    ?.filter((p) => p.station >= 20)
    .slice(0, 3);

  useEffect(() => {
    if (connected) {
      socket?.on(MatchSocketEvent.UPDATE, matchUpdate);
    }
  }, [connected]);

  useEffect(() => {
    return () => {
      socket?.removeListener(MatchSocketEvent.UPDATE, matchUpdate);
    };
  }, []);

  const matchUpdate = (newMatch: Match<HydrogenHorizons.MatchDetails>) => {
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
            <span>{match?.name}</span>
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
              <MatchCountdown audio />
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
                <RedParticipant
                  key={`${p.eventKey}-${p.tournamentKey}-${p.teamKey}`}
                  participant={p}
                />
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
                <BlueParticipant
                  key={`${p.eventKey}-${p.tournamentKey}-${p.teamKey}`}
                  participant={p}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatchPlayTimer;
