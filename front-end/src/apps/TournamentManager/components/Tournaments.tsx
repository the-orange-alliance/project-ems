import { FC, useState } from 'react';
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
import { getDifferences, removeFromArray } from 'src/stores/Util';
import { useModal } from '@ebay/nice-modal-react';
import TournamentRemovalDialog from '@components/Dialogs/TournamentRemovalDialog';
import { patchTournament, postTournaments } from 'src/api/ApiProvider';
import { useSnackbar } from 'src/hooks/use-snackbar';
import { useFlags } from 'src/stores/AppFlags';
import SaveAddUploadLoadingFab from 'src/components/SaveAddUploadLoadingFab';
import ViewReturn from 'src/components/ViewReturn/ViewReturn';

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
      const diffs = getDifferences(
        tournaments,
        prevTournaments,
        'tournamentKey'
      );
      setLoading(true);
      if (diffs.additions.length > 0) {
        await postTournaments(diffs.additions);
      }
      for (const tournament of diffs.edits) {
        await patchTournament(tournament);
      }
      await setFlags('createdTournaments', [
        ...flags.createdTournaments,
        event.eventKey
      ]);
      setLoading(false);
      showSnackbar(
        `(${
          diffs.additions.length + diffs.edits.length
        }) Tournaments successfully created`
      );
    } catch (e) {
      const error = e instanceof Error ? `${e.name} ${e.message}` : String(e);
      setLoading(false);
      showSnackbar('Error while uploading tournaments.', error);
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
      <ViewReturn title='Event' href={`/${event.eventKey}`} sx={{ mb: 1 }} />
      <SaveAddUploadLoadingFab
        loading={loading}
        onAdd={handleCreate}
        onSave={handlePost}
        canAdd
        canSave
        addTooltip='Add Tournament'
        saveTooltip='Save Tournaments'
      />
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
