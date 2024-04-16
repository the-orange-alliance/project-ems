import { FC, ReactNode } from 'react';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import { useRecoilValue } from 'recoil';
import { currentEventKeyAtom } from 'src/stores/recoil';
import { useEvent } from 'src/api/use-event-data';

interface Props {
  name: string;
  children?: ReactNode;
  pagebreak?: boolean;
}

export const Report: FC<Props> = ({ name, children, pagebreak }) => {
  const eventKey = useRecoilValue(currentEventKeyAtom);
  const { data: event } = useEvent(eventKey);

  return (
    <Box
      sx={{
        marginTop: (theme) => theme.spacing(2),
        pageBreakAfter: pagebreak ? 'always' : 'avoid'
      }}
    >
      <Typography align='center' variant='h4'>
        {event?.eventName ?? ''}
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
