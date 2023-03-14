import { FC } from 'react';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { SxProps, Theme } from '@mui/material';

interface Props {
  title: string;
  onClick: () => void;
  href?: string;
  sx?: SxProps<Theme>;
}

const ViewReturn: FC<Props> = ({ title, onClick, href, sx }) => {
  return (
    <Button onClick={onClick} href={href} sx={sx} >
      <ArrowBackIcon />
      &nbsp;
      <Typography>{title}</Typography>
    </Button>
  );
};

export default ViewReturn;
