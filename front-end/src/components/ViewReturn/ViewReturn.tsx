import { FC } from 'react';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

interface Props {
  title: string;
  onClick: () => void;
  href?: string;
}

const ViewReturn: FC<Props> = ({ title, onClick, href }) => {
  return (
    <Button onClick={onClick} href={href} >
      <ArrowBackIcon />
      &nbsp;
      <Typography>{title}</Typography>
    </Button>
  );
};

export default ViewReturn;
