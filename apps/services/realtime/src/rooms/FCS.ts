import { FieldControlStatus, FieldControlUpdatePacket } from '@toa-lib/models';
import { dirname } from 'path';
import { Server, Socket } from 'socket.io';
import { fileURLToPath } from 'url';
import Room from './Room.js';

const __filename = fileURLToPath(import.meta.url);
export const __dirname = dirname(__filename);

export default class FCS extends Room {
  private readonly latestFcsStatus: FieldControlUpdatePacket = {
    hubs: {},
    wleds: {}
  };
  private status: FieldControlStatus = { wleds: {} };

  public constructor(server: Server) {
    super(server, 'fcs');
  }

  public initializeEvents(socket: Socket): void {
    // Emit init and status packets when a client connects
    socket.emit('fcs:init');
    socket.emit('fcs:status', this.status);

    socket.on('fcs:setFieldOptions', (): void => {
      // TODO
    });

    socket.on('fcs:update', (): void => {
      // TODO
    });

    socket.on('fcs:prepareField', (): void => {
      // TODO
    });

    socket.on('fcs:allClear', (): void => {
      // TODO
    });

    socket.on('fcs:awardsMode', (): void => {
      // TODO
    });

    socket.on('fcs:settings', (): void => {
      // TODO
    });

    socket.on('fcs:digitalInputs', (): void => {
      // TODO
    });

    socket.on('fcs:clearStatus', (): void => {
      // TODO
    });

    socket.emit('fcs:update', this.latestFcsStatus);
  }
}
