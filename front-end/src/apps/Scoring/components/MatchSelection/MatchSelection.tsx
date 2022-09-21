import { FC, useEffect } from 'react';
import Paper from '@mui/material/Paper';
import Divider from '@mui/material/Divider';
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil';
import {
  matchesByTournamentTypeAtomFamily,
  selectedMatchKeyAtom,
  selectedTournamentLevel,
  selectedTournamentType
} from 'src/stores/Recoil';
import MatchResultsTable from 'src/features/components/MatchResultsTable/MatchResultsTable';
import TournamentDropdown from 'src/components/Dropdowns/TournamentDropdown';

const MatchSelection: FC = () => {
  const [tournamentLevel, setTournamentLevel] = useRecoilState(
    selectedTournamentLevel
  );
  const tournamentType = useRecoilValue(selectedTournamentType);
  const matches = useRecoilValue(
    matchesByTournamentTypeAtomFamily(tournamentType)
  );
  const setSelectedMatchKey = useSetRecoilState(selectedMatchKeyAtom);

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
      <MatchResultsTable matches={matches} onSelect={setSelectedMatchKey} />
    </Paper>
  );
};

export default MatchSelection;
