import { Server, Socket } from "socket.io";
import FCS from "./FCS.js";
import FRCFMS from "./FRCFMS.js";
import Match from "./Match.js";
import Room from "./Room.js";

const roomsMap: Map<string, Room> = new Map();

export function initRooms(server: Server) {
  const matchRoom = new Match(server);
  const fcsRoom = new FCS(server);
  const frcFMSRoom = new FRCFMS(server);

  roomsMap.set(matchRoom.getName(), matchRoom);
  roomsMap.set(fcsRoom.getName(), fcsRoom);
  roomsMap.set(frcFMSRoom.getName(), frcFMSRoom)
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
