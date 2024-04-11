import styled from '@emotion/styled';
import { FC } from 'react';
import { MatchTimer } from 'src/components/util/match-timer';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';

const Container = styled.div`
  overflow: hidden;
  width: 100%;
  height: 100%;
  background-color: #ffffff;
  color: #101820;
  font-size: 7vh;
  font-weight: bold;
`;

const IconContainer = styled.div`
  text-align: center;
  line-height: 1em;
`;

const TimerContainer = styled.div`
  text-align: center;
  line-height: 0.5em;
`;

export const MatchTimerDisplay: FC = () => {
  return (
    <Container>
      <IconContainer>
        <SmartToyOutlinedIcon fontSize='inherit' />
      </IconContainer>
      <TimerContainer>
        <MatchTimer audio />
      </TimerContainer>
    </Container>
  );
};
