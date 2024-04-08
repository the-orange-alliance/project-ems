import { FC, ReactNode } from 'react';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import { useRecoilValue } from 'recoil';
import { currentEventSelector } from 'src/stores/NewRecoil';

interface Props {
  name: string;
  children?: ReactNode;
  pagebreak?: boolean;
}

export const Report: FC<Props> = ({ name, children, pagebreak }) => {
  const eventName = useRecoilValue(currentEventSelector)?.eventName;

  return (
    <Box
      sx={{
        marginTop: (theme) => theme.spacing(2),
        pageBreakAfter: pagebreak ? 'always' : 'avoid'
      }}
    >
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
