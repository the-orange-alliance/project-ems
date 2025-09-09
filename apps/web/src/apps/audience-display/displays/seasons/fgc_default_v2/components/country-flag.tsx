import styled from '@emotion/styled';
import { FC } from 'react';

interface Props {
  cc: string;
  size?: number | string;
}

const Flag = styled.div`
  background-color: #00000000;
  border-radius: 1rem;
`;

export const CountryFlag: FC<Props> = ({ cc, size }) => {
  return (
    <Flag
      className={`flag-icon flag-icon-${cc.toLowerCase()}`}
      style={size ? { width: size, height: size } : undefined}
    />
  );
};
