import { FC, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import LoadingButton from '@mui/lab/LoadingButton';
import UpgradedTable from '@components/UpgradedTable/UpgradedTable';
import {
  useRecoilCallback,
  useRecoilState,
  useRecoilValue,
  useSetRecoilState
} from 'recoil';
import {
  currentEventSelector,
  currentTournamentKeyAtom,
  tournamentsByEventAtomFam,
  tournamentsByEventSelectorFam
} from 'src/stores/NewRecoil';
import { defaultTournament, Tournament } from '@toa-lib/models';
import { removeFromArray } from 'src/stores/Util';
import { useModal } from '@ebay/nice-modal-react';
import TournamentRemovalDialog from '@components/Dialogs/TournamentRemovalDialog';
import { postTournaments } from 'src/api/ApiProvider';
import { useSnackbar } from 'src/features/hooks/use-snackbar';
import { useFlags } from 'src/stores/AppFlags';

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

  // Custom Hooks
  const { showSnackbar } = useSnackbar();
  const [flags, setFlags] = useFlags();

  // Dialogs
  const removeModal = useModal(TournamentRemovalDialog);

  if (!event) return null;

  const handlePost = useRecoilCallback(({ snapshot }) => async () => {
    try {
      // The following logic takes the differences and uploads the new objects.
      const prevTournaments = await snapshot.getPromise(
        tournamentsByEventSelectorFam(event.eventKey)
      );
      const newTournaments = tournaments.filter(
        (t) => !prevTournaments.includes(t)
      );
      setLoading(true);
      await postTournaments(newTournaments);
      await setFlags('createdTournaments', [
        ...flags.createdTournaments,
        event.eventKey
      ]);
      setLoading(false);
      showSnackbar('Tournaments successfully created');
    } catch (e) {
      setLoading(false);
    }
  });

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
          onClick={handlePost}
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
          const fields = `[${t.fields.toString().replaceAll(',', ', ')}]`;
          return [
            eventName,
            t.tournamentKey,
            t.name,
            t.tournamentLevel,
            fields
          ];
        }}
        onModify={handleModify}
        onDelete={handleDelete}
      />
    </>
  );
};

export default Tournaments;
