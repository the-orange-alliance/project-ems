import { Server, Socket } from "socket.io";
import Room from "./Room";

export default class Match extends Room {
    public constructor(server: Server) {
        super(server, 'match');
    }

    public initializeEvents(socket: Socket): void {
        socket.on('match:prestart', (matchKey: string) => {
            console.log(`prestarting ${matchKey}`);
        });
    }
}