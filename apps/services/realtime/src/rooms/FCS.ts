import { dirname } from 'path';
import { Server, Socket } from 'socket.io';
import { fileURLToPath } from 'url';
import Room from './Room.js';

const __filename = fileURLToPath(import.meta.url);
export const __dirname = dirname(__filename);

export default class FCS extends Room {
  public constructor(server: Server) {
    super(server, 'fcs');
  }

  public initializeEvents(socket: Socket): void {
    // Emit init and status packets when a client connects
    socket.emit('fcs:init'); // TODO: send actual init data

    socket.on('fcs:prepareField', (): void => {
      this.broadcast().emit('fcs:prepareField');
    });

    socket.on('fcs:allClear', (): void => {
      this.broadcast().emit('fcs:allClear');
    });

    socket.on('fcs:awardsMode', (): void => {
      this.broadcast().emit('fcs:awardsMode');
    });

    socket.on('fcs:settings', (): void => {
      // TODO
    });

    socket.on('fcs:clearStatus', (): void => {
      // TODO
    });
  }
}
