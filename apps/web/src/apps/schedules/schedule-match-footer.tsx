import {
  ClockCircleOutlined,
  CloudUploadOutlined,
  DownloadOutlined
} from '@ant-design/icons';
import { Match, Tournament } from '@toa-lib/models';
import { Button, Space } from 'antd';
import { useAtomValue } from 'jotai';
import { FC } from 'react';
import { remoteClient } from 'src/api/http-clients.js';
import { useSnackbar } from 'src/hooks/use-snackbar.js';
import { remoteApiUrlAtom } from 'src/stores/state/ui.js';
import { normalizeRemoteApiHost } from 'src/util/remote-api-host.js';

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
      remoteClient.setBaseUrl(normalizeRemoteApiHost(remoteUrl));
      const scheduleParams = await remoteClient.get<Match<any>[]>(
        `/match/${tournament.eventKey}/${tournament.tournamentKey}`
      );
      onDownload(scheduleParams ?? []);
    } catch (e) {
      const error = e instanceof Error ? `${e.name} ${e.message}` : String(e);
      showSnackbar('Error while downloading matches.', error);
    }
  };

  return (
    <Space
      style={{
        width: '100%',
        justifyContent: 'flex-end',
        padding: '1em 0',
        marginTop: '2em'
      }}
    >
      <Button
        color='default'
        variant='outlined'
        icon={<DownloadOutlined />}
        disabled={disabled}
        onClick={handleDownload}
      >
        Download
      </Button>
      <Button
        color='blue'
        variant='outlined'
        icon={<ClockCircleOutlined />}
        disabled={disabled}
        onClick={onReassignTimes}
      >
        Update Match Times
      </Button>
      <Button
        color='green'
        variant='solid'
        icon={<CloudUploadOutlined />}
        disabled={disabled}
        onClick={onClick}
      >
        Post Schedule
      </Button>
    </Space>
  );
};
