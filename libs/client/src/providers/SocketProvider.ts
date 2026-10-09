import { type Socket, io } from 'socket.io-client';

export function createSocket(
  host: string,
  token: string,
  autoConnect?: boolean
): Socket<any, any> {
  return io(host, {
    rejectUnauthorized: false,
    transports: ['websocket'],
    query: { token },
    autoConnect
  });
}
