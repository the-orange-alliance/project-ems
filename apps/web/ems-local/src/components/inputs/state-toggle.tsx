import { FC, MouseEvent, ReactNode } from 'react';
import { Card, Typography, Radio, Row, Col } from 'antd';

interface Props<T> {
  title: ReactNode | string;
  states: T[];
  stateLabels?: string[];
  value: T;
  fullWidth?: boolean;
  disabled?: boolean;
  onChange?: (value: T) => void;
}

export function StateToggle<T>({
  title,
  states,
  stateLabels,
  value,
  fullWidth,
  disabled,
  onChange
}: Props<T>) {
  const handleChange = (e: any) => {
    if (onChange) {
      onChange(e.target.value);
    }
  };

  return (
    <Card
      style={{
        width: '100%',
        margin: 0,
        padding: 0,
        border: 'none',
        boxShadow: 'none'
      }}
      styles={{ body: { padding: 0 } }}
    >
      <Typography.Title
        level={5}
        style={{ textAlign: 'center', margin: 0, marginBottom: 8 }}
      >
        {title}
      </Typography.Title>
      <Radio.Group
        value={value}
        onChange={handleChange}
        disabled={disabled}
        style={{ width: '100%' }}
        optionType='button'
        buttonStyle='solid'
      >
        <Row gutter={8} style={{ width: '100%' }}>
          {states.map((s, i) => (
            <Col flex={fullWidth ? 'auto' : undefined} key={`${title}-${i}`}>
              <Radio.Button
                value={s}
                style={{
                  width: fullWidth ? '100%' : undefined,
                  textAlign: 'center'
                }}
              >
                {stateLabels ? stateLabels[i] : `${s}`}
              </Radio.Button>
            </Col>
          ))}
        </Row>
      </Radio.Group>
    </Card>
  );
}
