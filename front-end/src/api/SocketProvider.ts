import { useEffect, useState } from 'react';
import { createSocket } from '@toa-lib/client';
import { Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function setupSocket(token: string) {
  if (socket) destroySocket();

  socket = createSocket(token);

  socket.on('connect_error', (err) => {
    console.log(`connect_error due to ${err}`);
  });

  console.log('client connecting...');

  socket.connect();
  console.log('client connected');

  socket.emit('rooms', ['match']);
}

export function destroySocket() {
  socket?.disconnect();
  console.log('client disconnected');
}

export const useSocket = (): [Socket | null, boolean] => {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (socket) setConnected(socket.connected);
  }, [socket?.connected]);

  return [socket, connected];
};

/* Utility/helper functions for socket state */
export function sendPrestart(matchKey: string): void {
  socket?.emit('match:prestart', matchKey);
}

export default socket;
