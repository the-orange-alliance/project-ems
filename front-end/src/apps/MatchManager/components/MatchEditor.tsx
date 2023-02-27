import { FC, useState } from 'react';
import Box from '@mui/material/Box';
import MatchResultsTable from 'src/features/components/MatchResultsTable/MatchResultsTable';
import { useRecoilValue, useSetRecoilState } from 'recoil';
import {
  matchesByTournamentSelector,
  matchDialogOpenAtom
} from 'src/stores/NewRecoil';
import MatchEditDialog from 'src/components/MatchEditDialog/MatchEditDialg';

const MatchEditor: FC = () => {
  const matches = useRecoilValue(matchesByTournamentSelector);
  const setDialogOpen = useSetRecoilState(matchDialogOpenAtom);

  const [matchId, setMatchId] = useState(-1);

  const handleSelect = (id: number) => {
    setMatchId(id);
    setDialogOpen(true);
  };

  return (
    <Box>
      <MatchEditDialog id={matchId} />
      <MatchResultsTable matches={matches} onSelect={handleSelect} />
    </Box>
  );
};

export default MatchEditor;
