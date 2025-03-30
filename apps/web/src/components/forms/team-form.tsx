import { FC, ChangeEvent, useState, useEffect } from 'react';
import { Button, Form, Input, InputNumber, Row, Col } from 'antd';
import { Team, defaultTeam } from '@toa-lib/models';
import { ViewReturn } from '@components/buttons/view-return.js';

const FormField: FC<{
  name: string;
  label: string;
  value: string | number;
  type?: string;
  disabled?: boolean;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
}> = ({ name, label, value, type, disabled, onChange }) => {
  return (
    <Col xs={24} sm={12} md={8}>
      <Form.Item label={label} name={name}>
        {type === 'number' ? (
          <InputNumber
            value={value as number}
            onChange={(val) =>
              onChange({
                target: { name, value: val ?? '', type }
              } as ChangeEvent<HTMLInputElement>)
            }
            disabled={disabled}
            style={{ width: '100%' }}
          />
        ) : (
          <Input
            name={name}
            value={value}
            onChange={onChange}
            disabled={disabled}
          />
        )}
      </Form.Item>
    </Col>
  );
};

interface Props {
  initialTeam?: Team;
  loading?: boolean;
  onSubmit?: (team: Team) => void;
  returnTo?: string;
}

export const TeamForm: FC<Props> = ({
  initialTeam,
  loading,
  onSubmit,
  returnTo
}) => {
  const [team, setTeam] = useState({ ...(initialTeam ?? defaultTeam) });

  useEffect(() => {
    if (initialTeam) setTeam(initialTeam);
  }, [initialTeam]);

  const handleSubmit = () => onSubmit?.(team);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { type, name, value } = e.target;
    setTeam({
      ...team,
      [name]: type === 'number' ? parseInt(value) : value
    });
  };

  return (
    <Form layout='vertical' onFinish={handleSubmit}>
      <Row gutter={[16, 16]}>
        <FormField
          name='teamKey'
          label='Team Key'
          value={team.teamKey}
          onChange={handleChange}
          disabled
        />
        <FormField
          name='teamNumber'
          label='Team Number'
          value={team.teamNumber}
          onChange={handleChange}
          disabled={loading}
        />
        <FormField
          name='teamNameShort'
          label='Team Name (Short)'
          value={team.teamNameShort}
          onChange={handleChange}
          disabled={loading}
        />
        <FormField
          name='teamNameLong'
          label='Team Name (Long)'
          value={team.teamNameLong}
          onChange={handleChange}
          disabled={loading}
        />
        <FormField
          name='robotName'
          label='Robot Name'
          value={team.robotName}
          onChange={handleChange}
          disabled={loading}
        />
        <FormField
          name='city'
          label='City'
          value={team.city}
          onChange={handleChange}
          disabled={loading}
        />
        <FormField
          name='stateProv'
          label='State/Province'
          value={team.stateProv}
          onChange={handleChange}
          disabled={loading}
        />
        <FormField
          name='country'
          label='Country'
          value={team.country}
          onChange={handleChange}
          disabled={loading}
        />
        <FormField
          name='countryCode'
          label='Country Code'
          value={team.countryCode}
          onChange={handleChange}
          disabled={loading}
        />
        <FormField
          name='rookieYear'
          label='Rookie Year'
          type='number'
          value={team.rookieYear}
          onChange={handleChange}
          disabled={loading}
        />
      </Row>
      <Row justify='space-between'>
        <Col>{returnTo && <ViewReturn title='Back' href={returnTo} />}</Col>
        <Col>
          <Button
            type='primary'
            loading={loading}
            onClick={handleSubmit}
            disabled={loading}
          >
            {initialTeam ? 'Modify Team' : 'Create Team'}
          </Button>
        </Col>
      </Row>
    </Form>
  );
};
