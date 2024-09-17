import { FC, useState } from 'react';
import { RandomMatches } from '../match-gen/random-matches';
import { EventSchedule, Match, RESULT_NOT_PLAYED } from '@toa-lib/models';
import { useTeamsForEvent } from 'src/api/use-team-data';
import { useCurrentTournament } from 'src/api/use-tournament-data';
import { useScheduleItemsForTournament } from 'src/api/use-schedule-data';
import { ScheduleMatchFooter } from '../schedule-match-footer';
import { MatchTable } from 'src/components/tables/matches-table';
import { useSnackbar } from 'src/hooks/use-snackbar';
import { createRankings, deleteRankings } from 'src/api/use-ranking-data';
import { deleteMatches, postMatchSchedule } from 'src/api/use-match-data';
import { useModal } from '@ebay/nice-modal-react';
import ScheduleRepostDialog from 'src/components/dialogs/schedule-repost-dialog';
import { useRecoilState } from 'recoil';
import { matchesByEventKeyAtomFam } from 'src/stores/recoil';
import { useSWRConfig } from 'swr';
import { useSyncConfig } from 'src/hooks/use-sync-config';
import { resultsSyncMatches } from 'src/api/use-results-sync';

interface Props {
  eventSchedule?: EventSchedule;
  savedMatches?: Match<any>[];
  disabled?: boolean;
}

export const ScheduleMatches: FC<Props> = ({ eventSchedule, savedMatches }) => {
  const { mutate } = useSWRConfig();
  const [matches, setMatches] = useRecoilState(
    matchesByEventKeyAtomFam(eventSchedule?.eventKey ?? '')
  );
  const {apiKey, platform} = useSyncConfig();
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
      await createRankings(eventSchedule.tournamentKey, eventSchedule.teams);
      await postMatchSchedule(eventSchedule.eventKey, matches);
      await mutate(
        `match/${eventSchedule.eventKey}/${eventSchedule.tournamentKey}`,
        matches,
        false
      );
      await resultsSyncMatches(eventSchedule.eventKey, eventSchedule.tournamentKey, platform, apiKey);
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
      <RandomMatches
        eventSchedule={eventSchedule}
        scheduleItems={scheduleItems}
        tournament={tournament}
        onCreateMatches={handleCreateMatches}
      />
      {matchesToDisplay.length > 0 && (
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
