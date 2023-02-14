import { FC, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import LoadingButton from '@mui/lab/LoadingButton';
import UpgradedTable from '@components/UpgradedTable/UpgradedTable';
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil';
import {
  currentEventSelector,
  currentTournamentKeyAtom,
  tournamentsByEventAtomFam
} from 'src/stores/NewRecoil';
import { defaultTournament, Tournament } from '@toa-lib/models';
import { removeFromArray } from 'src/stores/Util';
import { useModal } from '@ebay/nice-modal-react';
import TournamentRemovalDialog from '@components/Dialogs/TournamentRemovalDialog';

import AddIcon from '@mui/icons-material/Add';

const Tournaments: FC = () => {
  // Recoil State
  const event = useRecoilValue(currentEventSelector);
  const [tournaments, setTournaments] = useRecoilState(
    tournamentsByEventAtomFam(event?.eventKey ?? '')
  );
  const setTournamentKey = useSetRecoilState(currentTournamentKeyAtom);

  // Local State
  const [loading, setLoading] = useState(false);

  // Dialogs
  const removeModal = useModal(TournamentRemovalDialog);

  if (!event) return null;

  const handleCreate = () => {
    const { eventKey } = event;
    setTournaments((prev) => [
      {
        ...defaultTournament,
        eventKey,
        tournamentKey: tournaments.length.toString()
      },
      ...prev
    ]);
  };

  const handleModify = (t: Tournament) => {
    setTournamentKey(t.tournamentKey);
  };

  const handleDelete = async (t: Tournament) => {
    const confirm = await removeModal.show({ tournament: t });
    if (confirm) {
      setTournaments(
        removeFromArray(tournaments, 'tournamentKey', t.tournamentKey)
      );
    }
  };

  return (
    <>
      <Box
        sx={{
          marginBottom: (theme) => theme.spacing(3),
          display: 'flex',
          justifyContent: 'flex-end',
          gap: (theme) => theme.spacing(2)
        }}
      >
        <LoadingButton
          loading={loading}
          variant='contained'
          disabled={tournaments.length <= 0}
        >
          Upload Tournaments
        </LoadingButton>
        <Button
          variant='contained'
          sx={{ padding: '6px', minWidth: '24px' }}
          onClick={handleCreate}
        >
          <AddIcon />
        </Button>
      </Box>
      <UpgradedTable
        data={tournaments}
        headers={['Event', 'Tournament ID', 'Name', 'Tournament', 'Fields']}
        renderRow={(t) => {
          const { eventName } = event;
          return [
            eventName,
            t.tournamentKey,
            t.name,
            t.tournamentLevel,
            t.fields
          ];
        }}
        onModify={handleModify}
        onDelete={handleDelete}
      />
    </>
  );
};

export default Tournaments;
