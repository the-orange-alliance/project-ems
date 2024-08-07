import { FC } from 'react';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { SxProps, Theme } from '@mui/material';
import { Link } from 'react-router-dom';

interface Props {
  title: string;
  onClick?: () => void;
  href?: string;
  sx?: SxProps<Theme>;
}

export const ViewReturn: FC<Props> = ({ title, onClick, href, sx }) => {
  const extraProps = href ? { component: Link, to: href } : onClick ? {onClick: onClick} : {};

  return (
    <Button sx={sx} {...extraProps}>
      <ArrowBackIcon />
      &nbsp;
      <Typography>{title}</Typography>
    </Button>
  );
};
