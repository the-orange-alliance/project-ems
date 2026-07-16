import { Match } from '@toa-lib/models';
import { ResultsBreakdown } from '../../../displays';
import { Row, Col } from 'antd';
import styled from '@emotion/styled';

interface BreakdownRowProps {
  breakdown: ResultsBreakdown<any>;
  match: Match<any>;
  alliance: 'red' | 'blue';
}

const RowContainer = styled(Row)((props: { color: string }) => ({
  height: '100%',
  fontSize: '3vh',
  fontWeight: '600',
  lineHeight: '.9',
  color: props.color
}));

const RowItem = styled(Col)(() => ({
  display: 'flex',
  alignItems: 'center'
}));

const BreakdownRow = ({ breakdown: b, match, alliance }: BreakdownRowProps) => {
  return (
    <RowContainer style={{ height: '100%' }} color={b.color}>
      <RowItem
        span={3}
        style={{
          textAlign: 'center',
          justifyContent: 'center'
        }}
      >
        {b.icon}
      </RowItem>
      <RowItem
        span={15}
        style={{
          borderRight: '.2em solid #00000060',
          textTransform: 'uppercase'
        }}
      >
        {b.title}
      </RowItem>
      <RowItem
        span={6}
        style={{ textAlign: 'center', justifyContent: 'center' }}
      >
        {b.resultCalc(match, alliance)}
      </RowItem>
    </RowContainer>
  );
};

export default BreakdownRow;
