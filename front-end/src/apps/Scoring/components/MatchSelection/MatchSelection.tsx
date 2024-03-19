import { FC, useEffect, useState } from 'react';
import Divider from '@mui/material/Divider';
import {
  useRecoilState,
  useRecoilValue,
  useResetRecoilState,
  useSetRecoilState
} from 'recoil';
import MatchResultsTable from 'src/components/tables/MatchResultsTable/MatchResultsTable';
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
import EventTournamentsDropdown from 'src/components/dropdowns/EventTournamentsDropdown';

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
  const [prevKey, setPrevKey] = useState<string | null>(tournamentKey);

  const handleSelect = (id: number): void => {
    setSelectedMatchId(id);
    resetMatch();
  };

  useEffect(() => {
    if (prevKey !== tournamentKey) setSelectedMatchId(null);
    setPrevKey(tournamentKey);
  }, [tournamentKey]);

  const handleTournamentChange = (tournament: Tournament | null) => {
    if (!tournament) return;
    setTournamentKey(tournament.tournamentKey);
  };

  return (
    <>
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
        colored
      />
    </>
  );
};

export default MatchSelection;
