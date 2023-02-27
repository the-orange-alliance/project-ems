import { FC } from 'react';
import FormGroup from '@mui/material/FormGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Typography from '@mui/material/Typography';
import Switch from '@mui/material/Switch';

interface Props {
  name: string;
  value: boolean;
  onChange: (value: boolean) => void;
}

const SwitchSetting: FC<Props> = ({ name, value, onChange }) => {
  const handleChange = () => onChange(!value);
  return (
    <FormGroup
      sx={{
        '&:hover': {
          backgroundColor: (theme) => theme.palette.action.hover
        }
      }}
    >
      <FormControlLabel
        control={<Switch checked={value} onChange={handleChange} />}
        label={
          <Typography sx={{ marginRight: 'auto', fontWeight: 'bold' }}>
            {name}
          </Typography>
        }
        labelPlacement='start'
        sx={{ padding: (theme) => theme.spacing(2) }}
      />
    </FormGroup>
  );
};

export default SwitchSetting;
