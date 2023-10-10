import { FC, useEffect } from 'react';
import Paper from '@mui/material/Paper';
import Divider from '@mui/material/Divider';
import {
  useRecoilState,
  useRecoilValue,
  useResetRecoilState,
  useSetRecoilState
} from 'recoil';
import MatchResultsTable from 'src/features/components/MatchResultsTable/MatchResultsTable';
import { MatchState, Tournament } from '@toa-lib/models';
import {
  currentEventKeyAtom,
  currentMatchIdAtom,
  currentTournamentFieldsAtom,
  currentTournamentKeyAtom,
  matchesByTournamentSelector,
  matchInProgressAtom,
  matchStateAtom
} from 'src/stores/NewRecoil';
import EventTournamentsDropdown from 'src/components/Dropdowns/EventTournamentsDropdown';

const MatchSelection: FC = () => {
  const [tournamentKey, setTournamentKey] = useRecoilState(
    currentTournamentKeyAtom
  );
  const eventKey = useRecoilValue(currentEventKeyAtom);
  const state = useRecoilValue(matchStateAtom);
  const fields = useRecoilValue(currentTournamentFieldsAtom);
  const matches = useRecoilValue(matchesByTournamentSelector).filter((m) =>
    fields.find((f) => f.field === m.fieldNumber)
  );
  const setSelectedMatchId = useSetRecoilState(currentMatchIdAtom);
  const resetMatch = useResetRecoilState(matchInProgressAtom);

  const handleSelect = (id: number): void => {
    setSelectedMatchId(id);
    resetMatch();
  };

  useEffect(() => {
    setSelectedMatchId(null);
  }, [tournamentKey]);

  const handleTournamentChange = (tournament: Tournament | null) => {
    if (!tournament) return;
    setTournamentKey(tournament.tournamentKey);
  };

  return (
    <Paper sx={{ padding: (theme) => theme.spacing(2) }}>
      <EventTournamentsDropdown
        eventKey={eventKey}
        value={tournamentKey}
        onChange={handleTournamentChange}
      />
      <Divider />
      <MatchResultsTable
        disabled={
          state >= MatchState.PRESTART_COMPLETE &&
          state <= MatchState.MATCH_COMPLETE
        }
        matches={matches}
        onSelect={handleSelect}
      />
    </Paper>
  );
};

export default MatchSelection;
