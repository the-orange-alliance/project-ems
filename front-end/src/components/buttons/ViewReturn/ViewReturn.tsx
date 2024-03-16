import { FC } from 'react';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { SxProps, Theme } from '@mui/material';
import { useNavigate } from 'react-router-dom';

interface Props {
  title: string;
  onClick?: () => void;
  href?: string;
  sx?: SxProps<Theme>;
}

const ViewReturn: FC<Props> = ({ title, onClick, href, sx }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick();
    }
    if (href) {
      navigate(href);
    }
  };

  return (
    <Button onClick={handleClick} sx={sx}>
      <ArrowBackIcon />
      &nbsp;
      <Typography>{title}</Typography>
    </Button>
  );
};

export default ViewReturn;
