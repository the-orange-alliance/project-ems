import { FC } from 'react';
import FormGroup from '@mui/material/FormGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Typography from '@mui/material/Typography';
import Switch from '@mui/material/Switch';

interface Props {
  name: string;
  value: boolean;
  onChange: (value: boolean) => void;
  inline?: boolean
  title?: string;
}

const SwitchSetting: FC<Props> = ({ name, value, onChange, inline, title }) => {
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
        labelPlacement={inline ? 'start' : 'top'}
        sx={{ padding: (theme) => theme.spacing(2) }}
        title={title}
      />
    </FormGroup>
  );
};

export default SwitchSetting;
