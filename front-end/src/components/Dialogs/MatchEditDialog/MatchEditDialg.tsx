import { FC, SyntheticEvent, useState, useEffect } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import { Tabs, Tab } from '@mui/material';
import TabPanel from 'src/components/util/TabPanel/TabPanel';
import MatchInfo from './MatchInfo';
import MatchParticipantInfo from './MatchParticipantInfo';
import MatchDetailInfo from './MatchDetailInfo';
import { patchWholeMatch, useMatchAll } from 'src/api/use-match-data';
import {
  resultsSyncMatches,
  resultsSyncRankings
} from 'src/api/use-results-sync';
import { sendCommitScores, sendPostResults } from 'src/api/SocketProvider';
import {
  currentTournamentSelector,
  matchByCurrentIdSelectorFam,
  matchDialogOpenAtom
} from 'src/stores/NewRecoil';

interface Props {
  id: number;
}

const MatchEditDialog: FC<Props> = ({ id }) => {
  const tournament = useRecoilValue(currentTournamentSelector);
  const [open, setOpen] = useRecoilState(matchDialogOpenAtom);
  const [match, setMatch] = useRecoilState(matchByCurrentIdSelectorFam(id));
  const { data: reqMatch } = useMatchAll(
    tournament
      ? {
          eventKey: tournament.eventKey,
          tournamentKey: tournament.tournamentKey,
          id
        }
      : undefined
  );

  useEffect(() => {
    if (reqMatch) setMatch(reqMatch);
  }, [reqMatch]);

  const [value, setValue] = useState<number>(0);

  const handleClose = () => setOpen(false);
  const handleChange = (event: SyntheticEvent, newValue: number) =>
    setValue(newValue);
  const handleUpdate = async () => {
    if (match) {
      await patchWholeMatch(match);
    }
    setOpen(false);
  };
  const handleUpdatePost = async () => {
    if (match) {
      const { eventKey, tournamentKey, id } = match;
      await patchWholeMatch(match);
      await sendCommitScores({ eventKey, tournamentKey, id });
      await sendPostResults();
      await resultsSyncMatches(match.eventKey, match.tournamentKey);
      await resultsSyncRankings(match.eventKey, match.tournamentKey);
    }
    setOpen(false);
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth='sm' fullWidth>
      <DialogTitle
        sx={{
          backgroundColor: (theme) => theme.palette.primary.main,
          color: (theme) => theme.palette.common.white
        }}
      >
        {match?.name}
      </DialogTitle>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={value} onChange={handleChange}>
          <Tab label='Info' />
          <Tab label='Participants' />
          <Tab label='Details' />
        </Tabs>
      </Box>
      <DialogContent>
        <TabPanel value={value} index={0}>
          <MatchInfo id={id} />
        </TabPanel>
        <TabPanel value={value} index={1}>
          <MatchParticipantInfo id={id} />
        </TabPanel>
        <TabPanel value={value} index={2}>
          <MatchDetailInfo id={id} />
        </TabPanel>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleUpdatePost} color='error'>
          Update & Post
        </Button>
        <Button onClick={handleUpdate}>Update</Button>
        <Button onClick={handleClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
};

export default MatchEditDialog;
