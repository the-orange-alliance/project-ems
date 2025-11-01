import { FC, useState, MouseEvent } from 'react';
import { FrcFmsSetting } from '../components/frc-fms-setting.js';
import { FMSSettings } from '@toa-lib/models';
import { postFrcFmsSettings } from 'src/api/use-fms-data.js';
import { useSocketWorker } from 'src/api/use-socket-worker.js';
import { Button, List, Space, Spin, Typography } from 'antd';

const FrcFmsSettingsTab: FC = () => {
  // TODO - @Soren you'll have to fix this sorry ¯\_(ツ)_/¯
  const [allFms, setAllFms] = useState<any[]>([]);
  const [settingOpen, setSettingOpen] = useState<boolean>(false);
  const [currentSetting, setCurrentSetting] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { worker, connected, events } = useSocketWorker();

  const openSetting = (i: number) => {
    setCurrentSetting(i);
    setSettingOpen(true);
  };

  const onSettingChange = async (value: FMSSettings, cancel: boolean) => {
    setSettingOpen(false);
    if (!cancel || !worker) {
      try {
        // Set loading state
        setLoading(true);

        // Upload Remote Copy and request FMS to update
        await postFrcFmsSettings(value);
        events.sendUpdateFrcFmsSettings(value.hwFingerprint);

        // Update Local copy
        const copy = [...allFms];
        copy[currentSetting] = value;
        setAllFms(copy);
        setError(null);
        setLoading(false);
      } catch (e) {
        // Catch and display error
        setError(e + '');
        setLoading(false);
      }
    }
  };

  const identify = (e: MouseEvent, fms: FMSSettings) => {
    e.stopPropagation();
    events.sendUpdateFrcFmsSettings(fms.hwFingerprint);
  };

  if (!connected) {
    return (
      <Space direction='vertical' style={{ width: '100%' }}>
        <Typography.Text>Please login to edit FMS settings!</Typography.Text>
      </Space>
    );
  }

  return (
    <Space direction='vertical' style={{ width: '100%' }}>
      {loading && <Spin />}
      <Typography>Select an FMS field set to edit its settings</Typography>
      <List>
        {allFms.map((fms, i) => (
          <List.Item
            title={fms.hwFingerprint}
            onClick={() => openSetting(i)}
            // disabled={loading}
            key={fms.hwFingerprint}
          >
            <Space>
              <Typography>
                <b>
                  Field Set{' '}
                  {fms.hwFingerprint.substring(fms.hwFingerprint.length - 8)}
                </b>
              </Typography>
              <Typography>
                <b>Event:</b>{' '}
                {fms.eventKey && fms.eventKey !== ''
                  ? fms.eventKey
                  : 'Unassigned'}
              </Typography>
              <Typography>
                <b>Field #:</b>{' '}
                {fms.fieldNumber < 0 ? 'Unasigned' : fms.fieldNumber}
              </Typography>
              <Typography>
                <b>Last Registered:</b>{' '}
                {new Date(fms.registeredAt).toDateString()}{' '}
                {new Date(fms.registeredAt).toTimeString()}
              </Typography>
            </Space>
            <Space style={{ marginLeft: 'auto' }}>
              <Button onClick={(e) => identify(e, fms)}>Identify</Button>
            </Space>
          </List.Item>
        ))}
      </List>
      {error && <Typography color='error'>{error}</Typography>}
      <FrcFmsSetting
        open={settingOpen}
        value={allFms[currentSetting]}
        onChange={onSettingChange}
      />
    </Space>
  );
};

export default FrcFmsSettingsTab;
