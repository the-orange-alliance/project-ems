import { FC } from 'react';
import PaperLayout from 'src/layouts/PaperLayout';
import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { useSocket } from 'src/api/SocketProvider';

const Streaming: FC = () => {
  const [socket] = useSocket();

  const sendBlank = () => socket?.emit('match:display', 0);
  const sendChroma = () => socket?.emit('match:display', -1);
  const sendPreview = () => socket?.emit('match:display', 1);
  const sendPlay = () => socket?.emit('match:display', 2);
  const sendResults = () => socket?.emit('match:display', 3);

  return (
    <PaperLayout
      containerWidth='lg'
      header={<Typography variant='h4'>Streaming App</Typography>}
    >
      <Grid container spacing={3} sx={{ padding: (theme) => theme.spacing(3) }}>
        <Grid item xs={12} sm={6} md={4} lg={3}>
          <Button variant='contained' fullWidth onClick={sendBlank}>
            Blank Screen
          </Button>
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={3}>
          <Button variant='contained' fullWidth onClick={sendChroma}>
            Chroma Background
          </Button>
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={3}>
          <Button variant='contained' fullWidth onClick={sendPreview}>
            Match Preview
          </Button>
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={3}>
          <Button variant='contained' fullWidth onClick={sendPlay}>
            Match Play
          </Button>
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={3}>
          <Button variant='contained' fullWidth onClick={sendResults}>
            Match Results
          </Button>
        </Grid>
      </Grid>
    </PaperLayout>
  );
};
export default Streaming;
