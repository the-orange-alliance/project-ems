import { FC, useState, useEffect } from 'react';
import { DateTime } from 'luxon';
import './JBApp.less';
import ChromaLayout from 'src/layouts/ChromaLayout';
import PrestartListener from 'src/components/PrestartListener/PrestartListener';
import MatchUpdateListener from 'src/components/MatchUpdateListener/MatchUpdateListener';
import { useRecoilValue } from 'recoil';
import MatchCountdown from 'src/features/components/MatchCountdown/MatchCountdown';
import { matchInProgressAtom } from 'src/stores/NewRecoil';

const JBApp: FC = () => {
  const match = useRecoilValue(matchInProgressAtom);
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
    <ChromaLayout>
      <PrestartListener />
      <MatchUpdateListener />
      <div className='jb-container'>
        <div>{time.toFormat('ttt')}</div>
        <div>{match?.name}</div>
        <div>
          <MatchCountdown />
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
    </ChromaLayout>
  );
};

export default JBApp;
