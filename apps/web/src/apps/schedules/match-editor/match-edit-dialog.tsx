import { Modal, Tabs, Button, Divider } from 'antd';
import { FC, useEffect, useState } from 'react';
import { mutate } from 'swr';
import { patchWholeMatch, useMatchAll } from 'src/api/use-match-data.js';
import { TabPanel } from 'src/components/util/tab-panel.js';
import { MatchInfoTab } from './match-info-tab.js';
import { PageLoader } from 'src/components/loading/page-loader.js';
import { Match, Team } from '@toa-lib/models';
import { MatchParticipantTab } from './match-participant-tab.js';
import { MatchDetailTab } from './match-detail-tab.js';
import { useSnackbar } from 'src/hooks/use-snackbar.js';
import { sendCommitScores, sendPostResults } from 'src/api/use-socket.js';
import { useModal } from '@ebay/nice-modal-react';
import MatchRepostDialog from 'src/components/dialogs/match-repost-dialog.js';

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
  const [value, setValue] = useState('0');
  const [match, setMatch] = useState<Match<any> | null>(null);
  const handleChange = (key: string) => setValue(key);
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
      const error =
        e instanceof Error
          ? `${e.name} ${e.message}\\n(${e.cause})`
          : String(e);
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
    <Modal
      open={open}
      onCancel={handleCancel}
      footer={null}
      width={600}
      title={
        <div style={{ background: '#1677ff', color: '#fff', padding: 12 }}>
          {match?.name}
        </div>
      }
      destroyOnClose
    >
      {match ? (
        <>
          <Tabs
            activeKey={value}
            onChange={handleChange}
            items={[
              {
                key: '0',
                label: 'Info',
                children: (
                  <TabPanel value={parseInt(value)} index={0}>
                    <MatchInfoTab match={match} onUpdate={handleUpdate} />
                  </TabPanel>
                )
              },
              {
                key: '1',
                label: 'Participants',
                children: (
                  <TabPanel value={parseInt(value)} index={1}>
                    <MatchParticipantTab
                      teams={teams}
                      match={match}
                      onUpdate={handleUpdate}
                    />
                  </TabPanel>
                )
              },
              {
                key: '2',
                label: 'Details',
                children: (
                  <TabPanel value={parseInt(value)} index={2}>
                    <MatchDetailTab match={match} onUpdate={handleUpdate} />
                  </TabPanel>
                )
              }
            ]}
            type='line'
          />
          <Divider />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button danger onClick={updateAndPost}>
              Update & Post
            </Button>
            <Button type='primary' onClick={updateMatch}>
              Update
            </Button>
            <Button onClick={handleCancel}>Cancel</Button>
          </div>
        </>
      ) : (
        <PageLoader />
      )}
    </Modal>
  );
};
