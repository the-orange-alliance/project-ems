import {
  ClockCircleOutlined,
  CloudUploadOutlined,
  DownloadOutlined,
  FileTextOutlined,
  UploadOutlined
} from '@ant-design/icons';
import { Match, Tournament } from '@toa-lib/models';
import { Button, Flex, Tooltip } from 'antd';
import { useAtomValue } from 'jotai';
import { ChangeEvent, FC, useRef } from 'react';
import { remoteClient } from 'src/api/http-clients.js';
import { useSnackbar } from 'src/hooks/use-snackbar.js';
import { remoteApiUrlAtom } from 'src/stores/state/ui.js';
import { normalizeRemoteApiHost } from 'src/util/remote-api-host.js';

interface Props {
  tournament?: Tournament;
  disabled?: boolean;
  /** Whether there is a schedule to post, adjust or export. */
  hasMatches: boolean;
  /** Whether the schedule has already been saved to the API. */
  saved: boolean;
  onClick: () => void;
  onReassignTimes: () => void;
  onDownload: (matches: Match<any>[]) => void;
  onDownloadJson: () => void;
  /** Receives the raw text of the selected JSON file. */
  onImport: (json: string) => void;
}

export const ScheduleMatchFooter: FC<Props> = ({
  tournament,
  disabled,
  hasMatches,
  saved,
  onClick,
  onReassignTimes,
  onDownload,
  onDownloadJson,
  onImport
}) => {
  const remoteUrl = useAtomValue(remoteApiUrlAtom);
  const { showErrorSnackbar } = useSnackbar();
  const importInputRef = useRef<HTMLInputElement>(null);

  const handleDownload = async () => {
    if (!tournament) return;
    try {
      remoteClient.setBaseUrl(normalizeRemoteApiHost(remoteUrl));
      const scheduleParams = await remoteClient.get<Match<any>[]>(
        `/match/${tournament.eventKey}/${tournament.tournamentKey}`
      );
      onDownload(scheduleParams ?? []);
    } catch (e) {
      showErrorSnackbar('Error while downloading matches.', e);
    }
  };

  const handleImport = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Clearing the value lets the same file be selected again after a rejection.
    e.target.value = '';
    if (!file) return;
    try {
      onImport(await file.text());
    } catch (err) {
      showErrorSnackbar('Error while reading file.', err);
    }
  };

  return (
    <Flex
      wrap
      align='center'
      justify='space-between'
      gap='small'
      style={{ paddingTop: hasMatches ? 24 : 0 }}
    >
      <Flex wrap align='center' gap='small'>
        <Tooltip
          title={
            saved
              ? 'A schedule has already been saved for this tournament.'
              : 'Import matches from a JSON file'
          }
        >
          <Button
            icon={<UploadOutlined />}
            disabled={saved || disabled || !tournament}
            onClick={() => importInputRef.current?.click()}
          >
            Import JSON
          </Button>
        </Tooltip>
        <input
          ref={importInputRef}
          hidden
          type='file'
          accept='.json,application/json'
          onChange={handleImport}
        />
        <Button
          icon={<DownloadOutlined />}
          disabled={disabled}
          onClick={handleDownload}
        >
          Download
        </Button>
        {hasMatches && (
          <Button icon={<FileTextOutlined />} onClick={onDownloadJson}>
            Download as JSON
          </Button>
        )}
      </Flex>
      {hasMatches && (
        <Flex wrap align='center' gap='small'>
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
        </Flex>
      )}
    </Flex>
  );
};
