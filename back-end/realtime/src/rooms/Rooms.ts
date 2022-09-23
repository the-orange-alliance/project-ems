import { Server, Socket } from "socket.io";
import FCS from "./FCS";
import Match from "./Match";
import MatchRoom from "./Match";
import Room from "./Room";

const roomsMap: Map<string, Room> = new Map();

export function initRooms(server: Server) {
  const matchRoom = new Match(server);
  const fcsRoom = new FCS(server);

  roomsMap.set(matchRoom.getName(), matchRoom);
  roomsMap.set(fcsRoom.getName(), fcsRoom);
}

export function assignRooms(rooms: string[], socket: Socket) {
  rooms.forEach((room) => {
    const r = roomsMap.get(room);
    if (!r) return;
    socket.join(r.getName());
    r.addClient(socket);
    r.initializeEvents(socket);
  });
}

export function leaveRooms(socket: Socket): void {
  for (const room of roomsMap.values()) {
    room.removeClient(socket);
  }
}
