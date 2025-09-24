import { FC } from 'react';
import FormGroup from '@mui/material/FormGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Typography from '@mui/material/Typography';
import Button, { ButtonPropsColorOverrides } from '@mui/material/Button';
import { OverridableStringUnion } from '@mui/types';

interface Props {
  name: string;
  buttonText: string;
  onClick: () => void;
  inline?: boolean;
  title?: string;
  fullWidth?: boolean;
  disabled?: boolean;
  color?: OverridableStringUnion<
    | 'inherit'
    | 'primary'
    | 'secondary'
    | 'success'
    | 'error'
    | 'info'
    | 'warning',
    ButtonPropsColorOverrides
  >;
}

export const ButtonSetting: FC<Props> = ({
  name,
  buttonText,
  onClick,
  inline,
  title,
  fullWidth,
  disabled,
  color
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
            color={color ?? 'primary'}
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
