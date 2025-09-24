import { FC, useState } from 'react';
import { RandomMatches } from '../match-gen/random-matches.js';
import {
  ScheduleParams,
  Match,
  RESULT_NOT_PLAYED,
  ScheduleItem,
  Tournament
} from '@toa-lib/models';
import { useTeamsForEvent } from 'src/api/use-team-data.js';
import { useCurrentTournament } from 'src/api/use-tournament-data.js';
import { useScheduleItemsForTournament } from 'src/api/use-schedule-data.js';
import { ScheduleMatchFooter } from '../schedule-match-footer.js';
import { MatchTable } from 'src/components/tables/matches-table.js';
import { useSnackbar } from 'src/hooks/use-snackbar.js';
import { createRankings, deleteRankings } from 'src/api/use-ranking-data.js';
import { deleteMatches, postMatchSchedule } from 'src/api/use-match-data.js';
import { useModal } from '@ebay/nice-modal-react';
import ScheduleRepostDialog from 'src/components/dialogs/schedule-repost-dialog.js';
import { useSWRConfig } from 'swr';
import { useSyncConfig } from 'src/hooks/use-sync-config.js';
import { resultsSyncMatches } from 'src/api/use-results-sync.js';
import { FixedMatches } from '../match-gen/fixed-matches.js';
import { useAtom } from 'jotai';
import { matchesAtom } from 'src/stores/state/event.js';

interface Props {
  eventSchedule?: ScheduleParams;
  onEventScheduleChange?: (eventSchedule: ScheduleParams) => void;
  savedMatches?: Match<any>[];
  disabled?: boolean;
}

export const ScheduleMatches: FC<Props> = ({ eventSchedule, savedMatches }) => {
  const { mutate } = useSWRConfig();
  const [matches, setMatches] = useAtom(matchesAtom);
  const { apiKey, platform } = useSyncConfig();
  const [loading, setLoading] = useState(false);
  const { data: scheduleItems } = useScheduleItemsForTournament(
    eventSchedule?.eventKey,
    eventSchedule?.tournamentKey
  );
  const { data: teams } = useTeamsForEvent(eventSchedule?.eventKey);
  const tournament = useCurrentTournament();
  const { showSnackbar } = useSnackbar();
  const repostModal = useModal(ScheduleRepostDialog);
  const hasMatchesWithScores = savedMatches
    ? savedMatches.some((m) => m.result && m.result > RESULT_NOT_PLAYED)
    : false;
  const matchesToDisplay =
    savedMatches && savedMatches.length ? savedMatches : matches;

  const saveSchedule = async () => {
    setLoading(true);
    try {
      if (!eventSchedule || !scheduleItems || !tournament) return;
      if (savedMatches && savedMatches.length > 0) {
        const canRepost = await repostModal.show();
        if (!canRepost) return;
        // Remove the past schedule, then post the new one.
        await deleteMatches(
          eventSchedule.eventKey,
          eventSchedule.tournamentKey
        );
        await deleteRankings(
          eventSchedule.eventKey,
          eventSchedule.tournamentKey
        );
      }
      await createRankings(
        eventSchedule.tournamentKey,
        teams?.filter((t) => eventSchedule.teamKeys.includes(t.teamKey)) ?? []
      );
      await postMatchSchedule(eventSchedule.eventKey, matches);
      await mutate(
        `match/${eventSchedule.eventKey}/${eventSchedule.tournamentKey}`,
        matches,
        false
      );
      await resultsSyncMatches(
        eventSchedule.eventKey,
        eventSchedule.tournamentKey,
        platform,
        apiKey
      );
      showSnackbar('Matches saved successfully.');
      setLoading(false);
    } catch (e) {
      setLoading(false);
      const error = e instanceof Error ? `${e.name} ${e.message}` : String(e);
      showSnackbar('Error while uploading matches.', error);
    }
  };

  const handleCreateMatches = (matches: Match<any>[]) => {
    if (!eventSchedule) return;
    const newMatches = matches
      .filter((m) => m.tournamentKey != eventSchedule.tournamentKey)
      .concat(matches);
    setMatches(newMatches);
    if (savedMatches) {
      mutate(
        `match/${eventSchedule.eventKey}/${eventSchedule.tournamentKey}`,
        newMatches,
        false
      );
    }
  };

  return (
    <>
      <MatchGen
        eventSchedule={eventSchedule}
        scheduleItems={scheduleItems}
        tournament={tournament}
        onCreateMatches={handleCreateMatches}
      />
      {eventSchedule && matchesToDisplay.length > 0 && (
        <>
          <MatchTable matches={matchesToDisplay} teams={teams} />
          <ScheduleMatchFooter
            disabled={loading || hasMatchesWithScores}
            onClick={saveSchedule}
          />
        </>
      )}
    </>
  );
};

interface MatchGenProps {
  eventSchedule?: ScheduleParams;
  scheduleItems?: ScheduleItem[];
  tournament?: Tournament;
  onCreateMatches: (matches: Match<any>[]) => void;
}

const MatchGen: FC<MatchGenProps> = ({
  eventSchedule,
  scheduleItems,
  tournament,
  onCreateMatches
}) => {
  if (!eventSchedule) return <div>Please select a tournament.</div>;
  switch (eventSchedule.type) {
    case 'Round Robin':
      return (
        <FixedMatches
          eventSchedule={eventSchedule}
          scheduleItems={scheduleItems}
          tournament={tournament}
          onCreateMatches={onCreateMatches}
        />
      );
    default:
      return (
        <RandomMatches
          eventSchedule={eventSchedule}
          scheduleItems={scheduleItems}
          tournament={tournament}
          onCreateMatches={onCreateMatches}
        />
      );
  }
};
