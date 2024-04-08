import { FC } from 'react';
import FormGroup from '@mui/material/FormGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';

interface Props {
  name: string;
  buttonText: string;
  onClick: () => void;
  inline?: boolean;
  title?: string;
  fullWidth?: boolean;
  disabled?: boolean;
}

export const ButtonSetting: FC<Props> = ({
  name,
  buttonText,
  onClick,
  inline,
  title,
  fullWidth,
  disabled
}) => {
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
          <Button
            variant='contained'
            onClick={onClick}
            sx={{ m: 1, minWidth: 220 }}
            fullWidth={fullWidth}
          >
            {buttonText}
          </Button>
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
