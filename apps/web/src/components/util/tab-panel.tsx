import { FC } from 'react';

interface Props {
  children?: React.ReactNode;
  index: number;
  value: number;
  noPadding?: boolean;
}

export const TabPanel: FC<Props> = ({
  children,
  index,
  value,
  noPadding,
  ...other
}) => {
  return (
    <div role='tabpanel' hidden={value !== index} {...other}>
      {value === index && (
        <div style={{ padding: noPadding ? 8 : 24 }}>{children}</div>
      )}
    </div>
  );
};
