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
  background-color: #101820;
  color: #ffffff;
  font-weight: bold;
  font-size: 1.75vw;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const LeftContent = styled.div`
  width: 10vw;
  height: 100%;
  padding-left: 10px;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const CenterContent = styled.div`
  width: 80vw;
  height: 100%;
  padding-left: 10px;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const RightContent = styled.div`
  width: 10vw;
  height: 100%;
  padding-right: 10px;
  display: flex;
  justify-content: center;
  align-items: center;
`;

interface Props {
  title: string;
  gridAreaId?: string;
}

export const MatchInfoBar: FC<Props> = ({ title, gridAreaId }) => {
  return (
    <Container style={{ gridArea: gridAreaId }}>
      <Top>
        <LeftContent>Up Next</LeftContent>
        <CenterContent>{title}</CenterContent>
        <RightContent>LOGO</RightContent>
      </Top>
    </Container>
  );
};
