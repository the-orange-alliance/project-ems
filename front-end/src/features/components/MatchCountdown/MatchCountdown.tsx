import { MatchSocketEvent, MatchState } from '@toa-lib/models';
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
import {
  matchStateAtom,
  matchTimeAtom,
  matchTimeModeAtom,
  timer
} from 'src/stores/NewRecoil';

const startAudio = initAudio(MATCH_START);
const transitionAudio = initAudio(MATCH_TRANSITION);
const teleAudio = initAudio(MATCH_TELE);
const abortAudio = initAudio(MATCH_ABORT);
const endgameAudio = initAudio(MATCH_ENDGAME);
const endAudio = initAudio(MATCH_END);

interface Props {
  audio?: boolean;
  mode?: 'modeTime' | 'timeLeft';
}

const MatchCountdown: FC<Props> = ({ audio, mode = 'timeLeft' }) => {
  const matchState = useRecoilValue(matchStateAtom);
  const [time, setTime] = useRecoilState(matchTimeAtom);
  const [modeTime, setModeTime] = useRecoilState(matchTimeModeAtom);
  const [socket, connected] = useSocket();

  useEffect(() => {
    if (connected) {
      socket?.on(MatchSocketEvent.PRESTART, onPrestart);
      socket?.on(MatchSocketEvent.START, onStart);
      socket?.on(MatchSocketEvent.ABORT, onAbort);

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
      setModeTime(timer.modeTimeLeft);
    }

    const tick = setInterval(() => {
      setTime(timer.timeLeft);
      setModeTime(timer.modeTimeLeft);
    }, 500);

    return () => {
      socket?.off(MatchSocketEvent.PRESTART, onPrestart);
      socket?.off(MatchSocketEvent.START, onStart);
      socket?.off(MatchSocketEvent.ABORT, onAbort);

      timer.off('timer:transition', onTransition);
      timer.off('timer:tele', onTele);
      timer.off('timer:endgame', onEndgame);
      timer.off('timer:end', onEnd);
      clearInterval(tick);
    };
  }, []);

  useEffect(() => {
    if (matchState === MatchState.MATCH_IN_PROGRESS && timer.inProgress()) {
      setTime(timer.timeLeft);
      setModeTime(timer.modeTimeLeft);
    }
  }, [matchState]);

  const timeDuration = Duration.fromObject({
    seconds: mode === 'timeLeft' ? time : modeTime
  });

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

  return (
    <>
      {mode === 'timeLeft'
        ? timeDuration.toFormat('m:ss')
        : timeDuration.toFormat('s')}
    </>
  );
};

export default MatchCountdown;
