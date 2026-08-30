import { FC, ChangeEvent, useState, useEffect } from 'react';
import { Button, Form, Input, Row, Col, Select } from 'antd';
import { CardStatus, Team, defaultTeam } from '@toa-lib/models';
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
      <Form.Item label={label}>
        <Input
          name={name}
          value={value}
          onChange={onChange}
          type={type ?? 'text'}
          disabled={disabled}
          size='large'
        />
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

  // hasCard mirrors cardStatus and cardPhase records which phase the card is in
  // force for, so all three are always written together. Clearing the card
  // clears the phase; setting one by hand here has no tournament context, so it
  // keeps whatever phase was already recorded.
  const handleCardStatusChange = (cardStatus: number) => {
    const cleared = cardStatus === CardStatus.NO_CARD;
    setTeam({
      ...team,
      cardStatus,
      hasCard: !cleared,
      cardPhase: cleared ? null : team.cardPhase
    });
  };

  return (
    <Form layout='vertical' onFinish={handleSubmit}>
      <Row gutter={16}>
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
        {/*
          Carried cards are only ever *set* automatically (a yellow issued in a
          match carries for the rest of the event). Nothing clears one
          automatically, so that a card cannot be dropped as a side effect of a
          later match being played or replayed — this control is the way back.
        */}
        <Col xs={24} sm={12} md={8}>
          <Form.Item
            label='Carried Card'
            // The phase is spelled out because this form has no tournament
            // context: a quals card shown here is not in force during playoffs.
            tooltip='Card this team carries for the rest of the phase it was issued in. Set automatically when a yellow is issued; clear it here if it was issued in error.'
            extra={
              team.cardPhase
                ? `In force for ${team.cardPhase} matches only`
                : undefined
            }
          >
            <Select
              value={team.cardStatus ?? CardStatus.NO_CARD}
              onChange={handleCardStatusChange}
              disabled={loading}
              size='large'
              options={[
                { value: CardStatus.NO_CARD, label: 'None' },
                { value: CardStatus.YELLOW_CARD, label: 'Yellow Card' }
              ]}
            />
          </Form.Item>
        </Col>
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
