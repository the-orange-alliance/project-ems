import { FC } from 'react';
import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';

const indeterminate = keyframes`
  0% { left: -35%; right: 100%; }
  60% { left: 100%; right: -90%; }
  100% { left: 100%; right: -90%; }
`;

const Container = styled.div`
  margin-top: -16px;
  background: #000000;
  min-height: 100%;
  min-width: 100%;
  position: relative;
`;

const Bar = styled.div`
  position: relative;
  overflow: hidden;
  height: 4px;
  width: 100%;
  background-color: rgba(25, 118, 210, 0.2);

  &::after {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    background-color: #1976d2;
    animation: ${indeterminate} 1.5s ease-in-out infinite;
  }
`;

export const Fallback: FC = () => {
  return (
    <Container>
      <Bar />
    </Container>
  );
};
