import { FC, ReactNode } from 'react';
import styled from '@emotion/styled';
import { Typography } from 'antd';

const Row = styled.div<{ $inline?: boolean; $disabled?: boolean }>`
  display: flex;
  flex-direction: ${(p) => (p.$inline ? 'row' : 'column')};
  align-items: ${(p) => (p.$inline ? 'center' : 'stretch')};
  padding: 16px;
  opacity: ${(p) => (p.$disabled ? 0.5 : 1)};
  pointer-events: ${(p) => (p.$disabled ? 'none' : 'auto')};

  &:hover {
    background-color: rgba(0, 0, 0, 0.04);
  }
`;

interface Props {
  name: string;
  children: ReactNode;
  inline?: boolean;
  title?: string;
  disabled?: boolean;
}

export const SettingRow: FC<Props> = ({
  name,
  children,
  inline,
  title,
  disabled
}) => (
  <Row $inline={inline} $disabled={disabled} title={title}>
    <Typography.Text
      strong
      style={{
        marginRight: inline ? 'auto' : undefined,
        marginBottom: inline ? undefined : 8
      }}
    >
      {name}
    </Typography.Text>
    {children}
  </Row>
);
