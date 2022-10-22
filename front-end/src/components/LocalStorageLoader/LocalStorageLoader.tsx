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
  fieldControl,
  followerMode,
  displayChromaKey
} from 'src/stores/Recoil';

const LocalStorageLoader: FC = () => {
  const [user, setUser] = useRecoilState(userAtom);

  const setHost = useSetRecoilState(hostIP);
  const setFields = useSetRecoilState(fieldControl);
  const setFollower = useSetRecoilState(followerMode);
  const setChroma = useSetRecoilState(displayChromaKey);

  const [, , setupSocket] = useSocket();

  // Check for cached login
  const [value] = useLocalStorage<UserLoginResponse>('ems:user', null);
  const [options] = useLocalStorage<FieldOptions>(
    'ems:fcs:options',
    defaultFieldOptions
  );
  const [host] = useLocalStorage<string>('ems:host', window.location.hostname);
  const [fields] = useLocalStorage<number[]>('ems:fields', []);
  const [mode] = useLocalStorage<boolean>('ems:mode', false);
  const [chromaKey] = useLocalStorage<string>('ems:aud:chroma', '#ff00ff');

  useEffect(() => {
    if (value && !user) {
      setUser(value);
      setupSocket(value.token);
    }
  }, [user, value, host]);

  useEffect(() => {
    setHost(host);
    setFields(fields);
    // Update API
    APIOptions.host = `http://${host}`;
  }, [host, fields]);

  useEffect(() => {
    setFollower(mode);
  }, [mode]);

  useEffect(() => {
    setChroma(chromaKey);
  }, [chromaKey]);

  return null;
};

export default LocalStorageLoader;
