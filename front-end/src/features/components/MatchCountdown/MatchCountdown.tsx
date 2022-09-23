import { MatchState } from '@toa-lib/models';
import { duration } from 'moment';
import { FC, useEffect } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';
import { matchStateAtom, matchTimeAtom, timer } from 'src/stores/Recoil';

const MatchCountdown: FC = () => {
  const matchState = useRecoilValue(matchStateAtom);
  const [time, setTime] = useRecoilState(matchTimeAtom);

  useEffect(() => {
    if (matchState === MatchState.MATCH_IN_PROGRESS && timer.inProgress()) {
      setTime(timer.timeLeft);
    }
  }, [matchState]);

  useEffect(() => {
    setTimeout(() => {
      setTime(timer.timeLeft);
    }, 1000);
  });

  const timeDuration = duration(time, 'seconds');
  const displayMinutes =
    timeDuration.minutes() < 10
      ? '0' + timeDuration.minutes().toString()
      : timeDuration.minutes().toString();
  const displaySeconds =
    timeDuration.seconds() < 10
      ? '0' + timeDuration.seconds().toString()
      : timeDuration.seconds().toString();

  return (
    <>
      {displayMinutes}:{displaySeconds}
    </>
  );
};

export default MatchCountdown;
