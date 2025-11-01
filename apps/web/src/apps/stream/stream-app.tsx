import { FC } from 'react';
import { PaperLayout } from 'src/layouts/paper-layout.js';
import { Displays, MatchSocketEvent } from '@toa-lib/models';
import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { useSocketWorker } from 'src/api/use-socket-worker.js';

export const StreamApp: FC = () => {
  const { worker } = useSocketWorker();

  const sendBlank = () =>
    worker?.emit(MatchSocketEvent.DISPLAY, Displays.BLANK);
  const sendChroma = () =>
    worker?.emit(MatchSocketEvent.DISPLAY, Displays.BLANK);
  const sendPreview = () =>
    worker?.emit(MatchSocketEvent.DISPLAY, Displays.MATCH_PREVIEW);
  const sendPlay = () =>
    worker?.emit(MatchSocketEvent.DISPLAY, Displays.MATCH_START);
  const sendResults = () =>
    worker?.emit(MatchSocketEvent.DISPLAY, Displays.MATCH_RESULTS);
  const sendRankingsRR = () =>
    worker?.emit(MatchSocketEvent.DISPLAY, Displays.RANKINGS);
  const sendRankingsF = () =>
    worker?.emit(MatchSocketEvent.DISPLAY, Displays.BLANK);

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
