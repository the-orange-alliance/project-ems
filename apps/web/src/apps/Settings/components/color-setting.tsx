import { FormGroup, FormControlLabel, Typography } from '@mui/material';
import { MuiColorInput } from 'mui-color-input';
import { FC } from 'react';

interface Props {
  name: string;
  value: string;
  format: 'hex' | 'string';
  onChange: (value: string) => void;
  inline?: boolean;
  title?: string;
  fullWidth?: boolean;
  disabled?: boolean;
}

export const ColorSetting: FC<Props> = ({
  name,
  value,
  onChange,
  inline,
  title,
  fullWidth,
  disabled,
  format
}) => {
  const handleChange = (value: string) => {
    onChange(format === 'string' ? value.substring(1, value.length) : value);
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
          <MuiColorInput
            format='hex'
            value={format === 'string' ? `#${value}` : value}
            onChange={handleChange}
            fullWidth={fullWidth}
            sx={{ m: 1, width: 224 }}
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
