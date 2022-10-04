import { UserLoginResponse } from '@toa-lib/models';
import { FieldOptions, defaultFieldOptions } from '@toa-lib/models';
import { FC, useEffect } from 'react';
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil';
import { useSocket } from 'src/api/SocketProvider';
import useLocalStorage from 'src/stores/LocalStorage';
import {
  userAtom,
  hostIP,
  fieldMotorDuration,
  fieldEndgameHB,
  fieldCountdownStyle,
  fieldCountdownDuration,
  fieldMatchOverStyle,
  fieldMatchOverLEDPattern,
  fieldColor1,
  fieldColor2,
  fieldTotalSetupDuration, fieldMotorReverseDuration
} from 'src/stores/Recoil';

const LocalStorageLoader: FC = () => {
  const [user, setUser] = useRecoilState(userAtom);
  const host = useRecoilValue(hostIP);

  const setMotorDuration = useSetRecoilState(fieldMotorDuration);
  const setEndGameHB = useSetRecoilState(fieldEndgameHB);
  const setCountdownStyle = useSetRecoilState(fieldCountdownStyle);
  const setCountdownDuration = useSetRecoilState(fieldCountdownDuration);
  const setMatchEndStyle = useSetRecoilState(fieldMatchOverStyle);
  const setMatchEndPattern = useSetRecoilState(fieldMatchOverLEDPattern);
  const setColor1 = useSetRecoilState(fieldColor1);
  const setColor2 = useSetRecoilState(fieldColor2);
  const setSetupDuration = useSetRecoilState(fieldTotalSetupDuration);
  const setMotorReverseDuration = useSetRecoilState(fieldMotorReverseDuration);

  const [, , setupSocket] = useSocket();

  // Check for cached login
  const [value] = useLocalStorage<UserLoginResponse>('ems:user', null);
  const [options] = useLocalStorage<FieldOptions>(
    'ems:fcs:options',
    defaultFieldOptions
  );

  useEffect(() => {
    if (value && !user) {
      setUser(value);
      setupSocket(value.token);
    }
  }, [user, value, host]);

  useEffect(() => {
    setMotorDuration(options.motorDuration);
    setEndGameHB(options.endGameHB);
    setCountdownStyle(options.countdownStyle);
    setCountdownDuration(options.countdownDuration);
    setMatchEndStyle(options.matchEndStyle);
    setMatchEndPattern(options.matchEndPattern);
    setColor1(options.primaryColor);
    setColor2(options.secondaryColor);
    setSetupDuration(options.setupDuration);
    setMotorReverseDuration(options.motorReverseDuration);
  }, [options]);

  return null;
};

export default LocalStorageLoader;
