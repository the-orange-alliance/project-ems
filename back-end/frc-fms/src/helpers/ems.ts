import { Event, Match, Tournament, WPAKey } from "@toa-lib/models";
import { MatchKey } from "@toa-lib/models";
import { environment, getIPv4 } from "@toa-lib/server";
import fetch from "node-fetch";

const host = getIPv4();
const port = environment.get().servicePort || "8080";

export const getToken = async (): Promise<string> => {
  const resp = await fetch(`http://${host}:${port}/auth/login`, {
    body: JSON.stringify({
      username: "localhost",
      password: "admin",
    }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const json: { token: any } = (await resp.json()) as any;
  return json.token;
};

/**
 * Get the event details
 * @param eventKey The Event Key to Fetch
 * @returns The Event Data
 */
export const getEvent = async (eventKey: string): Promise<Event> => {
  const resp = await fetch(`http://${host}:${port}/event/${eventKey}`);
  const json = await resp.json();
  return json as Event;
};

/**
 * Get the wpa keys
 * @param eventKey The Event Key to Fetch
 * @returns The Event Data
 */
export const getWpaKeys = async (eventKey: string): Promise<WPAKey[]> => {
  const resp = await fetch(
    `http://${host}:${port}/frc/fms/${eventKey}/wpakeys`
  );
  const json = await resp.json();
  return json as WPAKey[];
};

/**
 * Get match participants
 * @param matchKey the match to fetch
 * @returns The match
 */
export const getMatch = async (matchKey: MatchKey): Promise<Match<any>> => {
  const resp = await fetch(
    `http://${host}:${port}/match/all/${matchKey.eventKey}/${matchKey.tournamentKey}/${matchKey.id}`
  );
  const json = await resp.json();
  return json as Match<any>;
};

/**
* Get tournaments
* @param eventKey the eventKey to fetch tournaments for
* @returns The Tournament Data
*/
export const getTournaments = async (eventKey: string): Promise<Tournament[]> => {
 const resp = await fetch(
   `http://${host}:${port}/tournament/${eventKey}`
 );
 const json = await resp.json();
 return json as Tournament[];
};
