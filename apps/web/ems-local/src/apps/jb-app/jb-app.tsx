import { FC, useState, useEffect } from 'react';
import { DateTime } from 'luxon';
import './jb-app.less';
import { MatchTimer } from 'src/components/util/match-timer.js';
import { useAtomValue } from 'jotai';
import { matchAtom } from 'src/stores/state/event.js';

export const JBApp: FC = () => {
  const match = useAtomValue(matchAtom);
  const [time, setTime] = useState<DateTime>(DateTime.now());

  const redScore = match?.redScore || 0;
  const blueScore = match?.blueScore || 0;

  useEffect(() => {
    const timerId = setInterval(() => {
      setTime(DateTime.now());
    }, 250);

    return () => {
      clearInterval(timerId);
    };
  }, []);

  return (
    <div className='jb-container'>
      <div>{time.toFormat('ttt')}</div>
      <div>{match?.name}</div>
      <div>
        <MatchTimer />
      </div>
      <div className='jb-scores'>
        <div className={`red ${redScore > blueScore ? 'winning' : ''}`}>
          {redScore}
        </div>
        <div className={`blue ${redScore < blueScore ? 'winning' : ''}`}>
          {blueScore}
        </div>
      </div>
    </div>
  );
};

export default JBApp;
