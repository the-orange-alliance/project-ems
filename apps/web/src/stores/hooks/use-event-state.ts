import { useEffect, useRef } from 'react';
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

  const prevEvent = useRef<Event | null>(null);
  const prevTeams = useRef<Team[]>([]);
  const prevTournaments = useRef<Tournament[]>([]);

  const eventRequest = useEvent(config.event ? eventKey : undefined);
  const teamsRequest = useTeamsForEvent(
    config.teams ? event?.eventKey : undefined
  );
  const tournamentsRequest = useTournamentsForEvent(
    config.tournaments ? event?.eventKey : undefined
  );

  useEffect(() => {
    if (eventRequest.data) {
      if (!modifiedEvent && prevEvent.current) {
        eventRequest.mutate(prevEvent.current);
      } else {
        const newEvent = deepMerge(eventRequest.data, modifiedEvent);
        setEvent(newEvent);
      }
      prevEvent.current = modifiedEvent;
    }
  }, [eventRequest.data]);

  useEffect(() => {
    if (teamsRequest.data) {
      if (
        modifiedTeams.length <= 0 &&
        modifiedTeams.length !== prevTeams.current.length
      ) {
        teamsRequest.mutate(mergeWithTarget(teams, modifiedTeams, 'teamKey'));
      } else {
        const newTeams = mergeWithTarget(
          teamsRequest.data,
          modifiedTeams,
          'teamKey'
        );
        setTeams(newTeams);
      }
      prevTeams.current = modifiedTeams;
    }
  }, [teamsRequest.data, modifiedTeams]);

  useEffect(() => {
    if (tournamentsRequest.data) {
      if (
        modifiedTournaments.length <= 0 &&
        modifiedTournaments.length !== prevTournaments.current.length
      ) {
        tournamentsRequest.mutate(
          mergeWithTarget(tournaments, modifiedTournaments, 'tournamentKey')
        );
      } else {
        const newTournaments = mergeWithTarget(
          tournamentsRequest.data,
          modifiedTournaments,
          'tournamentKey'
        );
        setTournaments(newTournaments);
      }
      prevTournaments.current = modifiedTournaments;
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
