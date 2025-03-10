import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Tab,
  Tabs
} from '@mui/material';
import { FC, useEffect, useState } from 'react';
import { mutate } from 'swr';
import { patchWholeMatch, useMatchAll } from 'src/api/use-match-data';
import { TabPanel } from 'src/components/util/tab-panel';
import { MatchInfoTab } from './match-info-tab';
import { PageLoader } from 'src/components/loading/page-loader';
import { Match, Team } from '@toa-lib/models';
import { MatchParticipantTab } from './match-participant-tab';
import { MatchDetailTab } from './match-detail-tab';
import { useSnackbar } from 'src/hooks/use-snackbar';
import { sendCommitScores, sendPostResults } from 'src/api/use-socket';
import { useModal } from '@ebay/nice-modal-react';
import MatchRepostDialog from 'src/components/dialogs/match-repost-dialog';

interface Props {
  open: boolean;
  eventKey: string;
  tournamentKey: string;
  matchId: number;
  teams?: Team[];
  onClose: () => void;
}

export const MatchEditDialog: FC<Props> = ({
  open,
  eventKey,
  tournamentKey,
  matchId,
  teams,
  onClose
}) => {
  const [value, setValue] = useState(0);
  const [match, setMatch] = useState<Match<any> | null>(null);
  const handleChange = (_: React.SyntheticEvent, newValue: number) =>
    setValue(newValue);
  const { data: savedMatch } = useMatchAll({
    eventKey,
    tournamentKey,
    id: matchId
  });
  const { showSnackbar } = useSnackbar();
  const repostModal = useModal(MatchRepostDialog);
  useEffect(() => {
    if (savedMatch) setMatch(savedMatch);
  }, [savedMatch, matchId, setMatch]);
  const handleUpdate = (match: Match<any>) => {
    setMatch(match);
  };
  const updateMatch = async () => {
    if (!match) return;
    try {
      await patchWholeMatch(match);
      onClose();
      mutate(`match/${eventKey}/${tournamentKey}`);
    } catch (e) {
      const error = e instanceof Error ? `${e.name} ${e.message}` : String(e);
      showSnackbar('Error while uploading matches.', error);
    }
  };
  const updateAndPost = async () => {
    if (!match) return;
    const { eventKey, tournamentKey, id } = match;
    try {
      const canRepost = await repostModal.show();
      if (!canRepost) return;
      await patchWholeMatch(match);
      await sendCommitScores({ eventKey, tournamentKey, id });
      await sendPostResults();
      mutate(`match/${eventKey}/${tournamentKey}`);
      onClose();
      // TODO - Sync results
    } catch (e) {
      const error = e instanceof Error ? `${e.name} ${e.message}` : String(e);
      showSnackbar('Error while uploading matches.', error);
    }
  };
  const handleCancel = () => {
    onClose();
  };
  return (
    <Dialog open={open} onClose={handleCancel} maxWidth='sm' fullWidth>
      <DialogTitle
        sx={{
          backgroundColor: (theme) => theme.palette.primary.main,
          color: (theme) => theme.palette.common.white
        }}
      >
        {match?.name}
      </DialogTitle>
      {match ? (
        <>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={value} onChange={handleChange}>
              <Tab label='Info' />
              <Tab label='Participants' />
              <Tab label='Details' />
            </Tabs>
          </Box>
          <DialogContent>
            <TabPanel value={value} index={0}>
              <MatchInfoTab match={match} onUpdate={handleUpdate} />
            </TabPanel>
            <TabPanel value={value} index={1}>
              <MatchParticipantTab
                teams={teams}
                match={match}
                onUpdate={handleUpdate}
              />
            </TabPanel>
            <TabPanel value={value} index={2}>
              <MatchDetailTab match={match} onUpdate={handleUpdate} />
            </TabPanel>
          </DialogContent>
          <DialogActions>
            <Button onClick={updateAndPost} color='error'>
              Update & Post
            </Button>
            <Button onClick={updateMatch}>Update</Button>
            <Button onClick={handleCancel}>Cancel</Button>
          </DialogActions>
        </>
      ) : (
        <PageLoader />
      )}
    </Dialog>
  );
};
