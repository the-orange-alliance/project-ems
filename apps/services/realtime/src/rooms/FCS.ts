import { dirname } from 'path';
import { Server, Socket } from 'socket.io';
import { fileURLToPath } from 'url';
import Room from './Room.js';
import logger from '../util/Logger.js';
import { EcoEquilibriumFCS } from '@toa-lib/models';

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
      logger.info('fcs:prepareField');
      this.broadcast().emit('fcs:prepareField');
    });

    socket.on('fcs:allClear', (): void => {
      logger.info('fcs:allClear');
      this.broadcast().emit('fcs:allClear');
    });

    socket.on('fcs:awardsMode', (): void => {
      logger.info('fcs:awardsMode');
      this.broadcast().emit('fcs:awardsMode');
    });

    socket.on('fcs:settings', ({field, data}: {field: number, data: any}): void => {
      logger.info('fcs:settings', field, data);
      socket.to('fcs').emit('fcs:settings', {field, data});
    });

    socket.on('fcs:clearStatus', (): void => {
      logger.info('fcs:clearStatus');
      // TODO
    });

    // Season-Specific
    socket.on(EcoEquilibriumFCS.SocketEvents.EcosystemUpdate, (data: EcoEquilibriumFCS.EcosystemUpdate): void => {
      logger.info('fcs:ecosystemUpdate', data);
      this.server.to("match").emit(EcoEquilibriumFCS.SocketEvents.EcosystemUpdate, data);
    });
  }
}
