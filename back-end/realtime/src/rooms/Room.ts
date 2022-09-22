import { BroadcastOperator, Server, Socket } from "socket.io"
import { DefaultEventsMap } from "socket.io/dist/typed-events";

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
        this.initializeEvents(socket);
    }

    public broadcast(): BroadcastOperator<DefaultEventsMap, any> {
        return this._server.to(this.getName());
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