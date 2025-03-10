import { DEFAULT_SOCKET_HOST, DEFAULT_SOCKET_PORT } from '@toa-lib/models';
import io, { Socket } from 'socket.io-client';

export const options = {
  host: DEFAULT_SOCKET_HOST,
  port: DEFAULT_SOCKET_PORT
};

export function createSocket(
  token: string,
  autoConnect?: boolean
): Socket<any, any> {
  return io(`ws://${options.host}:${options.port}`, {
    rejectUnauthorized: false,
    transports: ['websocket'],
    query: { token },
    autoConnect
  });
}
