import { FC, ChangeEvent } from 'react';
import FormGroup from '@mui/material/FormGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';

interface Props {
  name: string;
  value: string;
  onChange: (value: string) => void;
  inline?: boolean;
  title?: string;
  fullWidth?: boolean;
  disabled?: boolean;
}

export const TextSetting: FC<Props> = ({
  name,
  value,
  onChange,
  inline,
  title,
  fullWidth,
  disabled
}) => {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) =>
    onChange(e.target.value);

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
        disabled={disabled}
      />
    </FormGroup>
  );
};
