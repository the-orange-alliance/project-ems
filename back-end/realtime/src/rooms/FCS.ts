import { Server, Socket } from 'socket.io';
import Room from './Room.js';
import Match from './Match.js';
export default class FCS extends Room {
  public constructor(server: Server, matchRoom: Match) {
    super(server, 'fcs');
  }

  public initializeEvents(socket: Socket): void {
    this.initEvent(socket, 'fcs:init');
    this.initEvent(socket, 'fcs:update');
    this.initEvent(socket, 'fcs:digitalInputs');
    this.initEvent(socket, 'fcs:prepareField');
    this.initEvent(socket, 'fcs:allClear');
  }

  private initEvent(socket: Socket, event: string): void {
    socket.on(event, (packet: any) => this.broadcast().emit(event, packet));
  }
}
