import styled from '@emotion/styled';
import { Match } from '@toa-lib/models';
import FGC_LOGO from '../assets/fg-logo-inverted.png';
import { Grid, Stack } from '@mui/material';

const InfoContainer = styled.div`
  flex-direction: column;
  background-color: #ffffff;
  border-radius: 1vw;
  margin-left: 15%;
  margin-right: 15%;
  padding-top: 0.04em;
  padding-bottom: 0.1em;
  color: black;
  line-height: 0.95;
  font-size: 3.3vh;
  font-weight: 800;
  text-align: center;
  height: 100%;
`;

const GridLogo = styled(Grid)(() => ({
  backgroundImage: `url(${FGC_LOGO})`,
  backgroundSize: 'contain',
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'center'
}));

const MatchTitle = ({
  match,
  branding = false,
  noMargin = false
}: {
  match: Match<any>;
  branding?: boolean;
  noMargin?: boolean;
}) => {
  const Item = branding ? GridLogo : Grid;
  return (
    <InfoContainer style={{ margin: noMargin ? 0 : undefined }}>
      <Grid
        container
        direction='row'
        justifyContent={'center'}
        sx={{ height: '100%' }}
      >
        {/* Funky Spacing Shenatigans (for FIRST global logo) */}
        <Grid item xs={0.2}></Grid>
        <Item item xs={2.3} />
        <Grid item xs={7}>
          <Stack sx={{ height: '100%' }} justifyContent={'center'}>
            <div>{match.name}</div>
            <div>Field {match.fieldNumber}</div>
          </Stack>
        </Grid>
        <Grid item xs={2.5}></Grid>
      </Grid>
    </InfoContainer>
  );
};

export default MatchTitle;
