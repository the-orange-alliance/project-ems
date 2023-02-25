import { MatchState } from '@toa-lib/models';
import { Duration } from 'luxon';
import { FC, useEffect } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';
import { useSocket } from 'src/api/SocketProvider';
import {
  initAudio,
  MATCH_START,
  MATCH_TELE,
  MATCH_TRANSITION,
  MATCH_ABORT,
  MATCH_ENDGAME,
  MATCH_END
} from 'src/apps/AudienceDisplay/Audio';
import { matchStateAtom, matchTimeAtom, timer } from 'src/stores/NewRecoil';

const startAudio = initAudio(MATCH_START);
const transitionAudio = initAudio(MATCH_TRANSITION);
const teleAudio = initAudio(MATCH_TELE);
const abortAudio = initAudio(MATCH_ABORT);
const endgameAudio = initAudio(MATCH_ENDGAME);
const endAudio = initAudio(MATCH_END);

interface Props {
  audio?: boolean;
}

const MatchCountdown: FC<Props> = ({ audio }) => {
  const matchState = useRecoilValue(matchStateAtom);
  const [time, setTime] = useRecoilState(matchTimeAtom);
  const [socket, connected] = useSocket();

  useEffect(() => {
    if (connected) {
      socket?.on('match:prestart', onPrestart);
      socket?.on('match:start', onStart);
      socket?.on('match:abort', onAbort);

      timer.on('timer:transition', onTransition);
      timer.on('timer:tele', onTele);
      timer.on('timer:endgame', onEndgame);
      timer.on('timer:end', onEnd);
    }
  }, [connected]);

  useEffect(() => {
    if (!timer.inProgress()) {
      timer.reset();
      setTime(timer.timeLeft);
    }
    const test = setInterval(() => {
      setTime(timer.timeLeft);
    }, 500);
    return () => {
      socket?.off('match:prestart', onPrestart);
      socket?.off('match:start', onStart);
      socket?.off('match:abort', onAbort);

      timer.off('timer:transition', onTransition);
      timer.off('timer:tele', onTele);
      timer.off('timer:endgame', onEndgame);
      timer.off('timer:end', onEnd);
      clearInterval(test);
    };
  }, []);

  useEffect(() => {
    if (matchState === MatchState.MATCH_IN_PROGRESS && timer.inProgress()) {
      setTime(timer.timeLeft);
    }
  }, [matchState]);

  const timeDuration = Duration.fromObject({ seconds: time });

  const onPrestart = () => {
    timer.reset();
    setTime(timer.timeLeft);
  };
  const onStart = () => {
    if (audio) startAudio.play();
    timer.start();
  };
  const onTransition = () => {
    if (audio) transitionAudio.play();
  };
  const onTele = () => {
    if (audio) teleAudio.play();
  };
  const onAbort = () => {
    if (audio) abortAudio.play();
    timer.abort();
  };
  const onEnd = () => {
    if (audio) endAudio.play();
    timer.stop();
  };

  const onEndgame = () => {
    if (audio) endgameAudio.play();
  };

  return <>{timeDuration.toFormat('m:ss')}</>;
};

export default MatchCountdown;
