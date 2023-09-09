import { FC, ChangeEvent } from 'react';
import FormGroup from '@mui/material/FormGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';

interface Props {
  name: string;
  value: number;
  onChange: (value: number) => void;
  inline?: boolean;
  type?: 'text' | 'number' | 'password';
  title?: string;
  fullWidth?: boolean;
}

const NumberSetting: FC<Props> = ({
  name,
  value,
  onChange,
  inline,
  type = 'text',
  title,
  fullWidth
}) => {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) =>
    onChange(parseInt(e.target.value));

  return (
    <FormGroup
      sx={{
        '&:hover': {
          backgroundColor: (theme) => theme.palette.action.hover
        }
      }}
    >
      <FormControlLabel
        control={
          <TextField
            value={value}
            onChange={handleChange}
            sx={{ m: 1, minWidth: 220 }}
            type={type}
            fullWidth={fullWidth}
          />
        }
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

export default NumberSetting;
