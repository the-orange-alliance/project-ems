import { FC } from 'react';

interface Props {
  cc: string;
}

export const CountryFlag: FC<Props> = ({ cc }) => {
  return <div className={`flag-icon flag-icon-${cc.toLowerCase()}`} />;
};
