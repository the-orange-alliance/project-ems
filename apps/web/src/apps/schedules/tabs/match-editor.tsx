import { ScheduleParams, Match } from '@toa-lib/models';
import { FC, useState } from 'react';
import { useTeamsForEvent } from 'src/api/use-team-data.js';
import { MatchResultsTable } from 'src/components/tables/match-results-table.js';
import { MatchEditDialog } from '../match-editor/match-edit-dialog.js';

interface Props {
  eventSchedule?: ScheduleParams;
  onEventScheduleChange?: (schedule: ScheduleParams) => void;
  savedMatches?: Match<any>[];
}

export const MatchEditor: FC<Props> = ({ eventSchedule, savedMatches }) => {
  const [open, setOpen] = useState(false);
  const [matchId, setMatchId] = useState<number>(-1);
  const { data: teams } = useTeamsForEvent(eventSchedule?.eventKey ?? '');
  const handleSelect = (id: number) => {
    setMatchId(id);
    setOpen(true);
  };
  const handleClose = () => setOpen(false);
  return (
    <div>
      {eventSchedule && savedMatches && (
        <MatchEditDialog
          eventKey={eventSchedule.eventKey}
          tournamentKey={eventSchedule.tournamentKey}
          teams={teams}
          matchId={matchId}
          open={open}
          onClose={handleClose}
        />
      )}
      <MatchResultsTable
        matches={savedMatches ?? []}
        teams={teams ?? []}
        onSelect={handleSelect}
        colored
      />
    </div>
  );
};
