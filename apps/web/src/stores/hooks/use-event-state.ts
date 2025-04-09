import { useEffect } from 'react';
import { Event, Team, Tournament } from '@toa-lib/models';
import { useAtom, useAtomValue } from 'jotai';
import { useEvent } from '@api/use-event-data.js';
import {
  eventAtom,
  eventKeyAtom,
  modifiedEventAtom,
  modifiedTeamsAtom,
  modifiedTournamentsAtom,
  teamsAtom,
  tournamentsAtom
} from '@stores/state/event.js';
import { useTeamsForEvent } from 'src/api/use-team-data.js';
import { useTournamentsForEvent } from 'src/api/use-tournament-data.js';
import { deepMerge, mergeWithTarget } from '../array-utils.js';

type StateConfig = {
  event?: boolean;
  teams?: boolean;
  tournaments?: boolean;
  matches?: boolean;
};

interface State {
  event: Event | null;
  teams: Team[];
  tournaments: Tournament[];
}

interface EventState {
  remote: State;
  local: State;
  staged: State;
}

interface EventSetters {
  setModifiedEvent: (
    event: Event | null | ((prev: Event | null) => Event | null)
  ) => void;
  setModifiedTeams: (teams: Team[] | ((prev: Team[]) => Team[])) => void;
  setModifiedTournaments: (
    teams: Tournament[] | ((prev: Tournament[]) => Tournament[])
  ) => void;
}

interface EventStateHookResponse {
  state: EventState & EventSetters;
  loading: boolean;
}

export const useEventState = (config: StateConfig): EventStateHookResponse => {
  const eventKey = useAtomValue(eventKeyAtom);

  const [event, setEvent] = useAtom(eventAtom);
  const [teams, setTeams] = useAtom(teamsAtom);
  const [tournaments, setTournaments] = useAtom(tournamentsAtom);

  const [modifiedEvent, setModifiedEvent] = useAtom(modifiedEventAtom);
  const [modifiedTeams, setModifiedTeams] = useAtom(modifiedTeamsAtom);
  const [modifiedTournaments, setModifiedTournaments] = useAtom(
    modifiedTournamentsAtom
  );

  const eventRequest = useEvent(config.event ? eventKey : undefined);
  const teamsRequest = useTeamsForEvent(
    config.teams ? event?.eventKey : undefined
  );
  const tournamentsRequest = useTournamentsForEvent(
    config.tournaments ? event?.eventKey : undefined
  );

  useEffect(() => {
    if (eventRequest.data) {
      const newEvent = deepMerge(eventRequest.data, modifiedEvent);
      setEvent(newEvent);
    }
  }, [eventRequest.data]);

  useEffect(() => {
    if (teamsRequest.data) {
      const newTeams = mergeWithTarget(
        teamsRequest.data,
        modifiedTeams,
        'teamKey'
      );
      setTeams(newTeams);
    }
  }, [teamsRequest.data, modifiedTeams]);

  useEffect(() => {
    if (tournamentsRequest.data) {
      const newTournaments = mergeWithTarget(
        tournamentsRequest.data,
        modifiedTournaments,
        'tournamentKey'
      );
      setTournaments(newTournaments);
    }
  }, [tournamentsRequest.data]);

  return {
    state: {
      setModifiedEvent,
      setModifiedTeams,
      setModifiedTournaments,
      local: {
        event: event,
        teams: teams,
        tournaments: tournaments
      },
      remote: {
        event: eventRequest.data ?? null,
        teams: teamsRequest.data ?? [],
        tournaments: tournamentsRequest.data ?? []
      },
      staged: {
        event: modifiedEvent,
        teams: modifiedTeams,
        tournaments: modifiedTournaments
      }
    },
    loading:
      eventRequest.isLoading ||
      teamsRequest.isLoading ||
      tournamentsRequest.isLoading
  };
};
