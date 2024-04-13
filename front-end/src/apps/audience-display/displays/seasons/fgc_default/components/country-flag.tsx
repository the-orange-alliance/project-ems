import styled from '@emotion/styled';
import { FC } from 'react';

interface Props {
  cc: string;
}

const Flag = styled.div`
  background-color: #000000;
`;

export const CountryFlag: FC<Props> = ({ cc }) => {
  return <Flag className={`flag-icon flag-icon-${cc}`} />;
};
