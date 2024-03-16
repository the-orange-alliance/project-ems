import { FC, useState, useEffect } from 'react';
import { useRecoilValue } from 'recoil';
import { getMatchTime } from '@toa-lib/models';
import MatchUpdateListener from 'src/components/MatchUpdateListener/MatchUpdateListener';
import MatchCountdown from 'src/components/MatchCountdown/MatchCountdown';
import {
  currentEventSelector,
  matchInProgressAtom,
  matchTimeAtom,
  timer
} from 'src/stores/NewRecoil';
import './MatchPlay.less';

const MatchPlay: FC = () => {
  const event = useRecoilValue(currentEventSelector);
  const match = useRecoilValue(matchInProgressAtom);
  const timeLeft = useRecoilValue(matchTimeAtom);
  const redAlliance = match?.participants?.filter((p) => p.station < 20) ?? [];
  const blueAlliance =
    match?.participants?.filter((p) => p.station >= 20) ?? [];

  // Timer Style
  const barWidth: number =
    ((getMatchTime(timer.matchConfig) - timeLeft) /
      getMatchTime(timer.matchConfig)) *
    100;

  const [timerStyle, setTimerStyle] = useState('green-bar');

  useEffect(() => {
    timer.on('timer:start', onTimerStart);
    timer.on('timer:endgame', onTimerEndgame);
    timer.on('timer:end', onTimerEnd);
    timer.on('timer:abort', onTimerEnd);

    return () => {
      timer.off('timer:start', onTimerStart);
      timer.off('timer:endgame', onTimerEndgame);
      timer.off('timer:end', onTimerEnd);
      timer.off('timer:abort', onTimerEnd);
    };
  });

  const onTimerStart = () => setTimerStyle('green-bar');
  const onTimerEndgame = () => setTimerStyle('yellow-bar');
  const onTimerEnd = () => setTimerStyle('red-bar');

  return (
    <div>
      <MatchUpdateListener stopAfterMatchEnd />
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
                  style={{
                    width: barWidth + '%',
                    borderTopRightRadius: barWidth >= 99 ? 0 : undefined,
                    borderBottomRightRadius: barWidth >= 99 ? 0 : undefined
                  }}
                  className={timerStyle}
                />
                <div id='cu-play-mid-timer-time' className='center-items'>
                  <MatchCountdown audio mode='modeTime' />
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
