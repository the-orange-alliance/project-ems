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
  step?: number;
  min?: number;
  max?: number;
}

export const NumberSetting: FC<Props> = ({
  name,
  value,
  onChange,
  inline,
  type = 'text',
  title,
  fullWidth,
  step,
  min,
  max
}) => {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const parsed = e.target.value.includes('.')
      ? parseFloat(e.target.value)
      : parseInt(e.target.value);

    if (isNaN(parsed)) {
      onChange(0);
    } else {
      onChange(parsed);
    }
  };

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
            inputProps={{
              step,
              min,
              max
            }}
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
