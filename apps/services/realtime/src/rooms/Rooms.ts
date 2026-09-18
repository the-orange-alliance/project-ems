import { Server, Socket } from "socket.io";
import FCS from "./FCS.js";
import FRCFMS from "./FRCFMS.js";
import Graphics from "./Graphics.js";
import Match from "./Match.js";
import Room from "./Room.js";

const roomsMap: Map<string, Room> = new Map();

/**
 * Not every deployment of this socket server needs to relay graphics
 * playback (e.g. a venue running only match/field control). Setting
 * `DISABLE_GRAPHICS` to anything other than `"false"`/`"0"`/empty skips
 * constructing the `Graphics` room entirely: no room is registered, no
 * `graphics:*` socket events are wired up, and the relay never calls out to
 * `GRAPHICS_API_BASE_URL` in the background.
 */
export function isGraphicsDisabled(): boolean {
  const value = process.env.DISABLE_GRAPHICS;
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized !== "" && normalized !== "false" && normalized !== "0";
}

export function initRooms(server: Server) {
  const matchRoom = new Match(server);
  const fcsRoom = new FCS(server);
  const frcFMSRoom = new FRCFMS(server);

  roomsMap.set(matchRoom.getName(), matchRoom);
  roomsMap.set(fcsRoom.getName(), fcsRoom);
  roomsMap.set(frcFMSRoom.getName(), frcFMSRoom);

  if (isGraphicsDisabled()) {
    return;
  }

  const graphicsRoom = new Graphics(server);
  roomsMap.set(graphicsRoom.getName(), graphicsRoom);
}

/**
 * Returns the graphics room for authoritative hydration and off-air preview replay.
 */
export function getGraphicsRoom(): Graphics | undefined {
  return roomsMap.get("graphics") as Graphics | undefined;
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
