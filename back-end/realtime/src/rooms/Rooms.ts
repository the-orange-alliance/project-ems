import { Server, Socket } from "socket.io";
import Match from "./Match";
import MatchRoom from './Match';
import Room from "./Room";

const roomsMap: Map<string, Room> = new Map();

export function initRooms(server: Server) {
    const matchRoom = new Match(server);
    roomsMap.set(matchRoom.getName(), matchRoom);
}

export function assignRooms(rooms: string[], socket: Socket) {
    rooms.forEach((room) => {
        const r = roomsMap.get(room);
        if (!r) return;
        r.addClient(socket);
        socket.join(r.getName());
    });
}