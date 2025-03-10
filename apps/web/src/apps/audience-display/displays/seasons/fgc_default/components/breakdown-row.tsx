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
  fontSize: '3vh',
  fontWeight: '600',
  lineHeight: '.9',
  color: props.color
}));

const RowItem = styled(Grid)(() => ({
  display: 'flex',
  alignItems: 'center'
}));

const BreakdownRow = ({ breakdown: b, match, alliance }: BreakdownRowProps) => {
  return (
    <RowContainer
      container
      direction='row'
      sx={{ height: '100%' }}
      color={b.color}
    >
      <RowItem
        item
        xs={1.5}
        sx={{
          textAlign: 'center',
          justifyContent: 'center'
        }}
      >
        {b.icon}
      </RowItem>
      <RowItem
        item
        xs={7.5}
        sx={{
          borderRight: '.2em solid #00000060',
          textTransform: 'uppercase'
        }}
      >
        {b.title}
      </RowItem>
      <RowItem
        item
        xs={3}
        sx={{ textAlign: 'center', justifyContent: 'center' }}
      >
        {b.resultCalc(match, alliance)}
      </RowItem>
    </RowContainer>
  );
};

export default BreakdownRow;
