import { Match } from '@toa-lib/models';
import { ResultsBreakdown } from '../../../displays';
import { Grid } from '@mui/material';
import styled from '@emotion/styled';

interface BreakdownRowProps {
  breakdown: ResultsBreakdown<any>;
  match: Match<any>;
  alliance: 'red' | 'blue';
}

const RowContainer = styled(Grid)((props: { color: string }) => ({
  height: '100%',
  fontSize: '3.2vh',
  fontWeight: '700',
  lineHeight: '.9',
  color: props.color
}));

const BreakdownRow = ({ breakdown: b, match, alliance }: BreakdownRowProps) => {
  return (
    <RowContainer
      container
      direction='row'
      sx={{ height: '100%' }}
      color={b.color}
    >
      <Grid item xs={1.5} sx={{ textAlign: 'center' }} alignContent={'center'}>
        {b.icon}
      </Grid>
      <Grid
        item
        xs={7.5}
        sx={{ borderRight: '.2em solid #00000060', textTransform: 'uppercase' }}
        alignContent={'center'}
      >
        {b.title}
      </Grid>
      <Grid item xs={3} alignContent={'center'} sx={{ textAlign: 'center' }}>
        {b.resultCalc(match, alliance)}
      </Grid>
    </RowContainer>
  );
};

export default BreakdownRow;
