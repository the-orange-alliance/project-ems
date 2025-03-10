import styled from '@emotion/styled';
import { Alliance } from '@toa-lib/models';
import { FC, ReactNode } from 'react';

const Container = styled.div`
  overflow: hidden;
  width: 100%;
  height: 100%;
  background-color: #ffffff;
  color: #101820;
  font-size: 6vh;
  font-weight: bold;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  padding-top: 16px;
  padding-bottom: 16px;
  gap: 8px;
`;

const TopContainer = styled.div`
  width: 100%;
  height: 100%;
  text-align: center;
  line-height: 0.75em;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const BotContainer = styled.div`
  width: 100%;
  height: 100%;
  text-align: center;
  line-height: 0.75em;
  display: flex;
  justify-content: center;
  align-items: center;
`;

interface Props {
  alliance?: Alliance;
  top: ReactNode;
  bot: ReactNode;
}

export const MatchBillboard: FC<Props> = ({ alliance, top, bot }) => {
  return (
    <Container
      style={
        alliance
          ? {
              backgroundColor: alliance === 'red' ? '#ed1c24' : '#0066B3',
              color: '#ffffff'
            }
          : undefined
      }
    >
      <TopContainer>{top}</TopContainer>
      <BotContainer>{bot}</BotContainer>
    </Container>
  );
};
