import { MatchState } from '@toa-lib/models';
import * as moment from 'moment';
import { FC, useEffect } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';
import { useSocket } from 'src/api/SocketProvider';
import { matchStateAtom, matchTimeAtom, timer } from 'src/stores/Recoil';

const MatchCountdown: FC = () => {
  const matchState = useRecoilValue(matchStateAtom);
  const [time, setTime] = useRecoilState(matchTimeAtom);
  const [socket, connected] = useSocket();

  useEffect(() => {
    if (connected) {
      socket?.on('match:prestart', onPrestart);
      socket?.on('match:start', onStart);
      socket?.on('match:abort', onAbort);
      socket?.on('match:end', onEnd);
    }
  }, [connected]);

  useEffect(() => {
    if (!timer.inProgress()) {
      timer.reset();
      setTime(timer.timeLeft);
    }
    return () => {
      socket?.off('match:prestart', onPrestart);
      socket?.off('match:start', onStart);
      socket?.off('match:abort', onAbort);
      socket?.off('match:end', onEnd);
    };
  }, []);

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

  const timeDuration = moment.duration(time, 'seconds');
  const displayMinutes =
    timeDuration.minutes() < 10
      ? '0' + timeDuration.minutes().toString()
      : timeDuration.minutes().toString();
  const displaySeconds =
    timeDuration.seconds() < 10
      ? '0' + timeDuration.seconds().toString()
      : timeDuration.seconds().toString();

  const onPrestart = () => {
    timer.reset();
    setTime(timer.timeLeft);
  };
  const onStart = () => timer.start();
  const onAbort = () => timer.abort();
  const onEnd = () => timer.stop();

  return (
    <>
      {displayMinutes}:{displaySeconds}
    </>
  );
};

export default MatchCountdown;
