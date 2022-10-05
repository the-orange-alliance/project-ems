import { FC, useEffect } from 'react';
import Paper from '@mui/material/Paper';
import Divider from '@mui/material/Divider';
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil';
import {
  fieldControl,
  loadedMatchKey,
  matchesByTournamentType,
  matchStateAtom,
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
  const matches = useRecoilValue(matchesByTournamentType(tournamentType));
  const fields = useRecoilValue(fieldControl);
  const setSelectedMatchKey = useSetRecoilState(loadedMatchKey);

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
        disabled={
          state >= MatchState.PRESTART_COMPLETE &&
          state <= MatchState.MATCH_COMPLETE
        }
        matches={matches.filter((m) => fields.indexOf(m.fieldNumber) > -1)}
        onSelect={handleSelect}
      />
    </Paper>
  );
};

export default MatchSelection;
