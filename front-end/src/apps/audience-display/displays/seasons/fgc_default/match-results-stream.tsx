import { FC } from 'react';
import { DisplayProps } from '../../displays';
import styled from '@emotion/styled';
import { AllianceResult } from './components/alliance-result';
import MatchTitle from './components/match-title';
import { Stack } from '@mui/material';

// It ain't jank if it works
const ScaledDiv = styled.div`
  transform: scale(0.54);
  transform-origin: top left;
  margin-top: 1em;
  margin-left: 1em;
`;

export const MatchResultsStream: FC<DisplayProps> = ({ match, ranks }) => {
  return (
    <ScaledDiv>
      <Stack sx={{ width: '30vw' }} spacing={5}>
        <MatchTitle match={match} noMargin />
        <AllianceResult alliance='red' match={match} ranks={ranks} />
        <AllianceResult alliance='blue' match={match} ranks={ranks} />
      </Stack>
    </ScaledDiv>
  );
};
