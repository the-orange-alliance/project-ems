import { FC } from 'react';
import { useRecoilValue } from 'recoil';
import {
  currentEventSelector,
  matchInProgressAtom
} from 'src/stores/NewRecoil';
import './MatchPlay.less';

const MatchPlay: FC = () => {
  const event = useRecoilValue(currentEventSelector);
  const match = useRecoilValue(matchInProgressAtom);
  const redAlliance = match?.participants?.filter((p) => p.station < 20) ?? [];
  const blueAlliance =
    match?.participants?.filter((p) => p.station >= 20) ?? [];
  return (
    <div>
      <div id='cu-play-container'>
        <div id='cu-play-top' className='center-items'>
          <div id='cu-play-top-left' className='center-items'>
            {/* <div className='center-left-items'>
              <img alt={'toa logo'} src={''} className='fit-h' />
            </div> */}
            <div className='center-items'>{match?.name}</div>
          </div>
          <div id='cu-play-top-right'>
            <div className='cu-play-event center-items'>{event?.eventName}</div>
            {/* <div className='cu-play-logo center-right-items'>
              <img alt={'facc logo'} src={''} className='fit-h' />
            </div> */}
          </div>
        </div>
        <div id='cu-play-bot' className='center-items'>
          <div id='cu-play-base'>
            <div id='cu-play-blue'>
              {blueAlliance.map((p) => (
                <div
                  key={`${p.eventKey}-${p.tournamentKey}-${p.teamKey}`}
                  className='cu-play-team'
                >
                  <span className={'cu-card-status ' + ''} />
                  <span>{p.teamKey}</span>
                </div>
              ))}
            </div>
            <div id='cu-play-mid'>
              <div id='cu-play-mid-timer' className='center-items'>
                <div
                  id='cu-play-mid-timer-bar'
                  // style={'yellow'}
                  className={''}
                />
                <div id='cu-play-mid-timer-time' className='center-items'>
                  00:00
                </div>
              </div>
              <div id='cu-play-mid-scores'>
                <div id='cu-play-mid-blue' className='center-items blue-bg'>
                  {match?.blueScore}
                </div>
                <div id='cu-play-mid-red' className='center-items red-bg'>
                  {match?.redScore}
                </div>
              </div>
            </div>
            <div id='cu-play-red'>
              {redAlliance.map((p) => (
                <div
                  key={`${p.eventKey}-${p.tournamentKey}-${p.teamKey}`}
                  className='cu-play-team'
                >
                  <span>{p.teamKey}</span>
                  <span className={'cu-card-status ' + ''} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatchPlay;
