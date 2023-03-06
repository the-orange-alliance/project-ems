import { FC, useState } from 'react';
import { AdminChannels, FMSSettings, TeamChannels } from '@toa-lib/models';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Grid } from '@mui/material';
import { eventsAtom } from 'src/stores/NewRecoil';
import { useRecoilState } from 'recoil';
import DropdownSetting from './DropdownSetting';
import TextSetting from './TextSetting';
import SwitchSetting from './SwitchSetting';

interface Props {
  onChange: (value: FMSSettings, cancel: boolean) => void;
  open: boolean;
  value: FMSSettings
}

const FrcFmsSetting: FC<Props> = ({ value, onChange, open }) => {

  const [settings, setSettings] = useState<FMSSettings>({ ...value });
  const [events] = useRecoilState(eventsAtom);

  const save = () => onChange(settings, false);
  const cancel = () => onChange(settings, true);

  // Update a key inside the settings object
  const updateState = (val: any, key: keyof FMSSettings) => setSettings({ ...settings, [key]: val });

  return (
    <Dialog open={open}>
      <DialogTitle>
        Editing <i>Field Set {value.hwFingerprint.substring(value.hwFingerprint.length - 8)}</i>
      </DialogTitle>
      <DialogContent>
        {/* Event Key / Field Number */}
        <Grid direction="row" container spacing={1}>
          {/* Event Key */}
          <Grid item xs={6}>
            <DropdownSetting name='Assigned Event' value={settings.eventKey} options={events.map(e => e.eventKey)} onChange={v => updateState(v, "eventKey")} />
          </Grid>
          {/* Field Number */}
          <Grid item xs={6}>
            <TextSetting name='Field Number' value={settings.fieldNumber} onChange={v => updateState(v, "fieldNumber")} type="number" />
          </Grid>
        </Grid>

        {/* Enable FMS / Enable Advanced Networking */}
        <Grid direction="row" container spacing={1}>
          {/* Enable FMS */}
          <Grid xs={6}>
            <SwitchSetting name='Enable Field Set' value={settings.enableFms} onChange={v => updateState(v, "enableFms")} inline />
          </Grid>
          {/* Enable Advanced Networking */}
          <Grid xs={6}>
            <SwitchSetting name='Enable Advanced Networking' value={settings.enableAdvNet} onChange={v => updateState(v, "enableAdvNet")} inline title={"Enable Field Access Point and Switch support"} />
          </Grid>
        </Grid>

        {/* AP IP Address */}
        <Grid direction="row" container spacing={1}>
          <Grid item xs={12}>
            <TextSetting name='AP IP Address' value={settings.apIp} onChange={v => updateState(v, "apIp")} fullWidth />
          </Grid>
        </Grid>

        {/* AP User / Password */}
        <Grid direction="row" container spacing={1}>
          {/* AP Username */}
          <Grid xs={6}>
            <TextSetting name='AP Username' value={settings.apUsername} onChange={v => updateState(v, "apUsername")} />
          </Grid>
          {/* AP Password */}
          <Grid xs={6}>
            <TextSetting name='AP Password' value={settings.apPassword} onChange={v => updateState(v, "apPassword")} />
          </Grid>
        </Grid>

        {/* AP Admin SSID / Password */}
        <Grid direction="row" container spacing={1}>
          {/* AP Admin SSID */}
          <Grid xs={6}>
            <TextSetting name='AP Admin Wifi SSID' value={settings.apAdminSsid} onChange={v => updateState(v, "apAdminSsid")} />
          </Grid>
          {/* AP Admin WPA Key */}
          <Grid xs={6}>
            <TextSetting name='AP Admin Wifi WPA Key' value={settings.apAdminWpa} onChange={v => updateState(v, "apAdminWpa")} />
          </Grid>
        </Grid>

        {/* AP Team Channel / Admin Channel */}
        <Grid direction="row" container spacing={1}>
          {/* AP Team Channel */}
          <Grid xs={6}>
            <DropdownSetting name='AP Admin Wifi Channel' value={settings.apAdminCh} options={AdminChannels} onChange={v => updateState(v, "apAdminCh")} />
          </Grid>
          {/* AP Admin WPA Key */}
          <Grid xs={6}>
            <DropdownSetting name='AP Team Wifi Channel' value={settings.apTeamCh} options={TeamChannels} onChange={v => updateState(v, "apTeamCh")} />
          </Grid>
        </Grid>

        {/* Switch IP / Password */}
        <Grid direction="row" container spacing={1}>
          {/* Switch IP */}
          <Grid xs={6}>
            <TextSetting name='Switch IP Address' value={settings.switchIp} onChange={v => updateState(v, "switchIp")} />
          </Grid>
          {/* Switch Password */}
          <Grid xs={6}>
            <TextSetting name='Switch Password' value={settings.switchPassword} onChange={v => updateState(v, "switchPassword")} />
          </Grid>
        </Grid>

        {/* Enable PLC / IP */}
        <Grid direction="row" container spacing={1}>
          {/* Enable PLC */}
          <Grid xs={6}>
            <SwitchSetting name='Enable PLC' value={settings.enablePlc} onChange={v => updateState(v, "enablePlc")} inline />
          </Grid>
          {/* PLC IP */}
          <Grid xs={6}>
            <TextSetting name='PLC IP Address' value={settings.plcIp} onChange={v => updateState(v, "switchPassword")} />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={cancel}>Cancel</Button>
        <Button onClick={save}>Save</Button>
      </DialogActions>
    </Dialog>

  );
};

export default FrcFmsSetting;
