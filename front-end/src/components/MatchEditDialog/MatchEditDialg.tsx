import { FC, SyntheticEvent, useState, useEffect } from 'react';
import { useRecoilState } from 'recoil';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import { matchByMatchKey, matchEditDialogOpen } from 'src/stores/Recoil';
import { Tabs, Tab } from '@mui/material';
import TabPanel from 'src/components/TabPanel/TabPanel';
import MatchInfo from './MatchInfo';
import MatchParticipantInfo from './MatchParticipantInfo';
import { patchWholeMatch, useMatchAll } from 'src/api/ApiProvider';
import MatchDetailInfo from './MatchDetailInfo';
import { sendCommitScores } from 'src/api/SocketProvider';

interface Props {
  matchKey: string;
}

const MatchEditDialog: FC<Props> = ({ matchKey }) => {
  const [open, setOpen] = useRecoilState(matchEditDialogOpen);
  const [match, setMatch] = useRecoilState(matchByMatchKey(matchKey));
  const { data: reqMatch } = useMatchAll(matchKey);

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
      await patchWholeMatch(match);
      await sendCommitScores(match.matchKey);
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
        {match?.matchName}
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
          <MatchInfo matchKey={matchKey} />
        </TabPanel>
        <TabPanel value={value} index={1}>
          <MatchParticipantInfo matchKey={matchKey} />
        </TabPanel>
        <TabPanel value={value} index={2}>
          <MatchDetailInfo matchKey={matchKey} />
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
