import { FC, useState } from 'react';
import Box from '@mui/material/Box';
import MatchResultsTable from 'src/features/components/MatchResultsTable/MatchResultsTable';
import { useRecoilValue, useSetRecoilState } from 'recoil';
import {
  selectedTournamentType,
  matchesByTournamentType,
  matchEditDialogOpen
} from 'src/stores/Recoil';
import MatchEditDialog from 'src/components/MatchEditDialog/MatchEditDialg';

const MatchEditor: FC = () => {
  const type = useRecoilValue(selectedTournamentType);
  const typeMatches = useRecoilValue(matchesByTournamentType(type));
  const setDialogOpen = useSetRecoilState(matchEditDialogOpen);

  const [matchKey, setMatchKey] = useState('');

  const handleSelect = (newKey: string) => {
    setMatchKey(newKey);
    setDialogOpen(true);
  };

  return (
    <Box>
      <MatchEditDialog matchKey={matchKey} />
      <MatchResultsTable matches={typeMatches} onSelect={handleSelect} />
    </Box>
  );
};

export default MatchEditor;
