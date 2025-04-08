import { useEffect } from 'react';
import { Event, Team, Tournament } from '@toa-lib/models';
import { useAtom, useAtomValue } from 'jotai';
import { useEvent } from '@api/use-event-data.js';
import {
  eventAtom,
  eventKeyAtom,
  teamsAtom,
  tournamentsAtom
} from '@stores/state/event.js';
import { useTeamsForEvent } from 'src/api/use-team-data.js';
import { useTournamentsForEvent } from 'src/api/use-tournament-data.js';

type StateConfig = {
  event?: boolean;
  teams?: boolean;
  tournaments?: boolean;
  matches?: boolean;
};

interface EventState {
  event: Event | null;
  teams: Team[];
  tournaments: Tournament[];
}

interface EventStateHookResponse {
  state: EventState;
  loading: boolean;
}

export const useEventState = (config: StateConfig): EventStateHookResponse => {
  const eventKey = useAtomValue(eventKeyAtom);

  const [event, setEvent] = useAtom(eventAtom);
  const [teams, setTeams] = useAtom(teamsAtom);
  const [tournaments, setTournaments] = useAtom(tournamentsAtom);

  const eventRequest = useEvent(config.event ? eventKey : undefined, {});
  const teamsRequest = useTeamsForEvent(
    config.teams ? event?.eventKey : undefined
  );
  const tournamentsRequest = useTournamentsForEvent(
    config.tournaments ? event?.eventKey : undefined
  );

  useEffect(() => {
    if (eventRequest.data) {
      setEvent(eventRequest.data);
    }
  }, [eventRequest.data]);

  useEffect(() => {
    if (teamsRequest.data) {
      setTeams(teamsRequest.data);
    }
  }, [teamsRequest.data]);

  useEffect(() => {
    if (tournamentsRequest.data) {
      setTournaments(tournamentsRequest.data);
    }
  }, [tournamentsRequest.data]);

  return {
    state: {
      event: config.event ? event : null,
      teams: config.teams ? teams : [],
      tournaments: config.tournaments ? tournaments : []
    },
    loading:
      eventRequest.isLoading ||
      teamsRequest.isLoading ||
      tournamentsRequest.isLoading
  };
};
