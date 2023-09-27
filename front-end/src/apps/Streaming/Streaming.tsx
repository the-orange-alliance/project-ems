import { FC } from 'react';
import PaperLayout from 'src/layouts/PaperLayout';
import { MatchSocketEvent } from '@toa-lib/models';
import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { useSocket } from 'src/api/SocketProvider';

const Streaming: FC = () => {
  const [socket] = useSocket();

  const sendBlank = () => socket?.emit(MatchSocketEvent.DISPLAY, 0);
  const sendChroma = () => socket?.emit(MatchSocketEvent.DISPLAY, -1);
  const sendPreview = () => socket?.emit(MatchSocketEvent.DISPLAY, 1);
  const sendPlay = () => socket?.emit(MatchSocketEvent.DISPLAY, 2);
  const sendResults = () => socket?.emit(MatchSocketEvent.DISPLAY, 3);
  const sendRankingsRR = () => socket?.emit(MatchSocketEvent.DISPLAY, 4);
  const sendRankingsF = () => socket?.emit(MatchSocketEvent.DISPLAY, 5);

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
        <Grid item xs={12} sm={6} md={4} lg={3}>
          <Button variant='contained' fullWidth onClick={sendRankingsRR}>
            Rankings (Round Robin)
          </Button>
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={3}>
          <Button variant='contained' fullWidth onClick={sendRankingsF}>
            Rankings (Finals)
          </Button>
        </Grid>
      </Grid>
    </PaperLayout>
  );
};
export default Streaming;
