import {
  UserLoginResponse,
  FieldOptions,
  defaultFieldOptions
} from '@toa-lib/models';
import { APIOptions } from '@toa-lib/client';
import { FC, useEffect } from 'react';
import { useRecoilState, useSetRecoilState } from 'recoil';
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
  fieldTotalSetupDuration,
  fieldMotorReverseDuration,
  fieldControl,
  followerMode
} from 'src/stores/Recoil';

const LocalStorageLoader: FC = () => {
  const [user, setUser] = useRecoilState(userAtom);

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
  const setHost = useSetRecoilState(hostIP);
  const setFields = useSetRecoilState(fieldControl);
  const setFollower = useSetRecoilState(followerMode);

  const [, , setupSocket] = useSocket();

  // Check for cached login
  const [value] = useLocalStorage<UserLoginResponse>('ems:user', null);
  const [options] = useLocalStorage<FieldOptions>(
    'ems:fcs:options',
    defaultFieldOptions
  );
  const [host] = useLocalStorage<string>('ems:host', APIOptions.host);
  const [fields] = useLocalStorage<number[]>('ems:fields', []);
  const [mode] = useLocalStorage<boolean>('ems:mode', false);

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

  useEffect(() => {
    setHost(host);
    setFields(fields);
    // Update API
    APIOptions.host = `http://${host}`;
  }, [host, fields]);

  useEffect(() => {
    setFollower(mode);
  }, [mode]);

  return null;
};

export default LocalStorageLoader;
