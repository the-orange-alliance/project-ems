import { APIOptions } from '@toa-lib/client';
import { Match, Tournament } from '@toa-lib/models';
import { Button } from 'antd';
import { useAtomValue } from 'jotai';
import { FC } from 'react';
import { getMatchSchedule } from 'src/api/use-match-data.js';
import { useSnackbar } from 'src/hooks/use-snackbar.js';
import { remoteApiUrlAtom } from 'src/stores/state/ui.js';

interface Props {
  tournament?: Tournament;
  disabled?: boolean;
  onClick: () => void;
  onReassignTimes: () => void;
  onDownload: (matches: Match<any>[]) => void;
}

export const ScheduleMatchFooter: FC<Props> = ({
  tournament,
  disabled,
  onClick,
  onReassignTimes,
  onDownload
}) => {
  const remoteUrl = useAtomValue(remoteApiUrlAtom);
  const { showSnackbar } = useSnackbar();

  const handleDownload = async () => {
    if (!tournament) return;
    try {
      const previousUrl = APIOptions.host;
      APIOptions.host = remoteUrl;
      const scheduleParams = await getMatchSchedule(
        tournament.eventKey,
        tournament.tournamentKey
      );
      APIOptions.host = previousUrl;
      onDownload(scheduleParams);
    } catch (e) {
      const error = e instanceof Error ? `${e.name} ${e.message}` : String(e);
      showSnackbar('Error while downloading matches.', error);
    }
  };

  return (
    <>
      <Button
        style={{ marginTop: '2em' }}
        disabled={disabled}
        onClick={onClick}
      >
        Post Schedule
      </Button>
      <Button
        style={{ marginTop: '2em' }}
        disabled={disabled}
        onClick={onReassignTimes}
      >
        Update Match Times
      </Button>
      <Button
        style={{ marginTop: '2em' }}
        disabled={disabled}
        onClick={handleDownload}
      >
        Download
      </Button>
    </>
  );
};
