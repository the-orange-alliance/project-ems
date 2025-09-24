import styled from '@emotion/styled';
import { FC } from 'react';

const Container = styled.div`
  transition: all 0.5s ease;
  // top: -6.5vh;
  position: relative;
  z-index: 1;
`;

const Top = styled.div`
  width: 100vw;
  overflow: hidden;
  height: 100%;
  background-color: #ffffff;
  color: #101820;
  font-weight: bold;
  font-size: 1.75vw;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const LeftContent = styled.div`
  width: 15vw;
  height: 100%;
  padding-left: 10px;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #101820;
`;

const CenterContent = styled.div`
  width: 70vw;
  height: 100%;
  padding-left: 20px;
  display: flex;
  justify-content: flex-start;
  align-items: center;
`;

const RightContent = styled.div`
  width: 15vw;
  height: 100%;
  padding-right: 10px;
  display: flex;
  justify-content: center;
  align-items: center;
`;

interface Props {
  title: string;
}

export const MatchBottomBar: FC<Props> = ({ title }) => {
  return (
    <Container>
      <Top>
        <LeftContent>LOGO</LeftContent>
        <CenterContent>{title}</CenterContent>
        <RightContent></RightContent>
      </Top>
    </Container>
  );
};
