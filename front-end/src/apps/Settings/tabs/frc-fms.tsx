import { FC, useState } from 'react';
import Box from '@mui/material/Box';
import { useRecoilState } from 'recoil';
import { allFrcFmsAtom } from 'src/stores/NewRecoil';
import { LinearProgress, List, ListItem, ListItemButton, Typography } from '@mui/material';
import FrcFmsSetting from '../components/FrcFmsSetting';
import { FMSSettings } from '@toa-lib/models';
import { postFrcFmsSettings } from 'src/api/ApiProvider';
import { sendUpdateFrcFmsSettings } from 'src/api/SocketProvider';

const FrcFmsSettingsTab: FC = () => {
  const [allFms, setAllFms] = useRecoilState(allFrcFmsAtom);
  const [settingOpen, setSettingOpen] = useState<boolean>(false);
  const [currentSetting, setCurrentSetting] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const openSetting = (i: number) => {
    setCurrentSetting(i);
    setSettingOpen(true);
  }

  const onSettingChange = async (value: FMSSettings, cancel: boolean) => {
    setSettingOpen(false);
    if (!cancel) {
      try {
        // Set loading state
        setLoading(true);

        // Upload Remote Copy and request FMS to update
        await postFrcFmsSettings(value);
        await sendUpdateFrcFmsSettings(value.hwFingerprint);

        // Update Local copy
        const copy = [...allFms];
        copy[currentSetting] = value;
        setAllFms(copy);
        setError(null);
        setLoading(false);
      } catch (e) {
        // Catch and display error
        setError(e + "");
        setLoading(false);
      }
    }
  }

  return (
    <Box>
      {loading && <LinearProgress />}
      <Typography>Select an FMS field set to edit its settings</Typography>
      <List>
        {
          allFms.map((fms, i) => (
            <ListItemButton title={fms.hwFingerprint} sx={{ display: "block" }} onClick={() => openSetting(i)} disabled={loading}>
              <Typography><b>Field Set {fms.hwFingerprint.substring(fms.hwFingerprint.length - 8)}</b></Typography>
              <Typography sx={{ ml: 2 }}><b>Event:</b> {fms.eventKey && fms.eventKey !== "" ? fms.eventKey : "Unassigned"}</Typography>
              <Typography sx={{ ml: 2 }}><b>Field #:</b> {fms.fieldNumber < 0 ? "Unasigned" : fms.fieldNumber}</Typography>
              <Typography sx={{ ml: 2 }}><b>Last Registered:</b> {new Date(fms.registeredAt).toDateString()} {new Date(fms.registeredAt).toTimeString()}</Typography>
            </ListItemButton>
          ))
        }
      </List>
      {error && <Typography color="error">{error}</Typography>}
      <FrcFmsSetting open={settingOpen} value={allFms[currentSetting]} onChange={onSettingChange} />
    </Box>
  );
};

export default FrcFmsSettingsTab;
