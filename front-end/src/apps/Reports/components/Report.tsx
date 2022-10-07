import { FC, ReactNode } from 'react';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import { useRecoilValue } from 'recoil';
import { eventAtom } from 'src/stores/Recoil';

interface Props {
  name: string;
  children?: ReactNode;
}

const Report: FC<Props> = ({ name, children }) => {
  const eventName = useRecoilValue(eventAtom)?.eventName;

  return (
    <Box sx={{ marginTop: (theme) => theme.spacing(2) }}>
      <Typography align='center' variant='h4'>
        {eventName}
      </Typography>
      <Typography align='center' variant='h5'>
        {name}
      </Typography>
      <Divider
        sx={{
          marginTop: (theme) => theme.spacing(2)
        }}
      />
      {children}
    </Box>
  );
};

export default Report;
