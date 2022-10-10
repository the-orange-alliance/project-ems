import { BroadcastOperator, Server, Socket } from "socket.io";

export default abstract class Room {
  private clients: Socket[];
  private name: string;
  private _server: Server;

  public constructor(server: Server, name: string) {
    this._server = server;
    this.clients = [];
    this.name = name;
  }

  public abstract initializeEvents(socket: Socket): void;

  public addClient(socket: Socket): void {
    this.clients.push(socket);
  }

  public removeClient(socket: Socket): void {
    if (this.clients.indexOf(socket) > -1) {
      this.clients.splice(this.clients.indexOf(socket), 1);
    }
  }

  public broadcast(): BroadcastOperator<any, any> {
    return this._server.in(this.getName());
  }

  public getName(): string {
    return this.name;
  }

  get server(): Server {
    return this._server;
  }

  set server(server: Server) {
    this._server = server;
  }
}
