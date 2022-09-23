import { FC, useEffect } from 'react';
import Paper from '@mui/material/Paper';
import Divider from '@mui/material/Divider';
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil';
import {
  matchesByTournamentTypeAtomFamily,
  matchStateAtom,
  selectedMatchKeyAtom,
  selectedTournamentLevel,
  selectedTournamentType
} from 'src/stores/Recoil';
import MatchResultsTable from 'src/features/components/MatchResultsTable/MatchResultsTable';
import TournamentDropdown from 'src/components/Dropdowns/TournamentDropdown';
import { MatchState } from '@toa-lib/models';

const MatchSelection: FC = () => {
  const [tournamentLevel, setTournamentLevel] = useRecoilState(
    selectedTournamentLevel
  );
  const tournamentType = useRecoilValue(selectedTournamentType);
  const state = useRecoilValue(matchStateAtom);
  const matches = useRecoilValue(
    matchesByTournamentTypeAtomFamily(tournamentType)
  );
  const setSelectedMatchKey = useSetRecoilState(selectedMatchKeyAtom);

  const handleSelect = (matchKey: string): void => {
    setSelectedMatchKey(matchKey);
  };

  useEffect(() => {
    setSelectedMatchKey(null);
  }, [tournamentLevel]);

  const changeTournamentLevel = (value: number) => setTournamentLevel(value);

  return (
    <Paper sx={{ padding: (theme) => theme.spacing(2) }}>
      <TournamentDropdown
        value={tournamentLevel}
        onChange={changeTournamentLevel}
      />
      <Divider />
      <MatchResultsTable
        disabled={state >= MatchState.PRESTART_COMPLETE}
        matches={matches}
        onSelect={handleSelect}
      />
    </Paper>
  );
};

export default MatchSelection;
