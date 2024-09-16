import { FC, useState, useEffect } from 'react';
import { DateTime } from 'luxon';
import './jb-app.less';
import { ChromaLayout } from 'src/layouts/chroma-layout';
import { useRecoilValue } from 'recoil';
import { MatchTimer } from 'src/components/util/match-timer';
import { matchOccurringAtom } from 'src/stores/recoil';
import { SyncMatchOccurringToRecoil } from 'src/components/sync-effects/sync-match-occurring-to-recoil';
import { SyncOnPrestart } from 'src/components/sync-effects/sync-on-prestart';

export const JBApp: FC = () => {
  const match = useRecoilValue(matchOccurringAtom);
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
      <SyncMatchOccurringToRecoil />
      <SyncOnPrestart />
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
    </ChromaLayout>
  );
};

export default JBApp;
