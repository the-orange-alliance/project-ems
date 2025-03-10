import styled from '@emotion/styled';
import { FC } from 'react';

const Container = styled.div`
  background-color: #ffffff;
  width: 16vw;
  height: 5vh;
  display: flex;
  justify-content: center;
  align-items: center;
  font-weight: bold;
  font-size: 2vw;
`;

const LeftText = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #cacaca;
`;

const RightText = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
`;

interface Props {
  left: string | number;
  right: string | number;
}

export const InfoBar: FC<Props> = ({ left, right }) => {
  return (
    <Container>
      <LeftText>{left.toString().toUpperCase()}</LeftText>
      <RightText>{right.toString()}</RightText>
    </Container>
  );
};
