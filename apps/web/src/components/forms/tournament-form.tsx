import { Row, Col, Form, Input, Button } from 'antd';
import { Tournament, TournamentType, defaultTournament } from '@toa-lib/models';
import { FC, ChangeEvent, useState, useEffect } from 'react';
import { TournamentDropdown } from '../dropdowns/tournament-level-dropdown.js';
import { ViewReturn } from '../buttons/view-return.js';
import { TournamentTypesDropdown } from '../dropdowns/tournament-types-dropdown.js';

const FormField: FC<{
  name: string;
  label: string;
  value: string | number;
  type?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
}> = ({ name, label, value, type, disabled, required, error, onChange }) => {
  return (
    <Col xs={24} sm={12} md={6}>
      <Form.Item
        label={label}
        required={required}
        validateStatus={error ? 'error' : undefined}
        help={error}
      >
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

const Fields: FC<{
  tournament: Tournament;
  disabled?: boolean;
  onUpdate: (fields: string[]) => void;
}> = ({ tournament, disabled, onUpdate }) => {
  const handleAdd = () => {
    onUpdate([...tournament.fields, `Field ${tournament.fields.length + 1}`]);
  };

  const handleRemove = () => {
    const clone = [...tournament.fields];
    clone.pop();
    onUpdate(clone);
  };

  const updateFieldName = (i: number, name: string) => {
    const clone = [...tournament.fields];
    clone[i] = name;
    onUpdate(clone);
  };

  return (
    <Row gutter={[24, 16]}>
      {tournament.fields.map((f: string, i: number) => {
        const onChange = (e: ChangeEvent<HTMLInputElement>) => {
          updateFieldName(i, e.target.value);
        };
        return (
          <Col key={`field-${i}`} span={24}>
            <Form.Item label={`Field ${i + 1}`}>
              <Input
                name='fieldName'
                value={tournament.fields[i]}
                disabled={disabled}
                onChange={onChange}
              />
            </Form.Item>
          </Col>
        );
      })}
      <Col xs={12} md={6} lg={4}>
        <Button block onClick={handleAdd}>
          Add Field
        </Button>
      </Col>
      <Col xs={12} md={6} lg={4}>
        <Button
          block
          onClick={handleRemove}
          disabled={tournament.fields.length <= 1}
        >
          Remove Field
        </Button>
      </Col>
    </Row>
  );
};

interface Props {
  initialTournament?: Tournament;
  loading?: boolean;
  onSubmit: (tournament: Tournament) => void;
  returnTo?: string;
}

export const TournamentForm: FC<Props> = ({
  initialTournament,
  loading,
  onSubmit,
  returnTo
}) => {
  const [tournament, setTournament] = useState<Tournament>({
    ...(initialTournament ?? defaultTournament)
  });
  const [nameError, setNameError] = useState<string | undefined>();

  useEffect(() => {
    if (initialTournament) setTournament(initialTournament);
  }, [initialTournament]);

  const handleSubmit = () => {
    if (!tournament.name.trim()) {
      setNameError('Name is required.');
      return;
    }
    onSubmit?.(tournament);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { type, name, value } = e.target;
    if (name === 'name' && value.trim()) setNameError(undefined);
    setTournament({
      ...tournament,
      [name]: type === 'number' ? parseInt(value) : value
    });
  };

  const handleLevelChange = (tournamentLevel: number) => {
    setTournament({
      ...tournament,
      tournamentLevel
    });
  };

  const handleTypeChange = (tournamentType: TournamentType) => {
    setTournament({
      ...tournament,
      tournamentType
    });
  };

  const handleFieldUpdate = (fields: string[]) => {
    setTournament({
      ...tournament,
      fields,
      fieldCount: fields.length
    });
  };

  return (
    <Form layout='vertical'>
      <Row gutter={[24, 24]}>
        <FormField
          name='tournamentKey'
          label='Tournament Key'
          value={tournament.tournamentKey}
          onChange={handleChange}
          disabled={typeof initialTournament !== 'undefined' || loading}
        />
        <FormField
          name='name'
          label='Name'
          value={tournament.name}
          onChange={handleChange}
          disabled={loading}
          required
          error={nameError}
        />
        <Col xs={24} sm={12} md={6}>
          <Form.Item label='Tournament Level'>
            <TournamentDropdown
              fullWidth
              value={tournament.tournamentLevel}
              onChange={handleLevelChange}
              disabled={loading}
            />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Form.Item label='Tournament Type'>
            <TournamentTypesDropdown
              fullWidth
              value={tournament.tournamentType}
              onChange={handleTypeChange}
              disabled={loading}
            />
          </Form.Item>
        </Col>
      </Row>
      <Fields
        tournament={tournament}
        disabled={loading}
        onUpdate={handleFieldUpdate}
      />
      <Row justify='space-between'>
        <Col>{returnTo && <ViewReturn title='Back' href={returnTo} />}</Col>
        <Col>
          <Button
            type='primary'
            loading={loading}
            onClick={handleSubmit}
            disabled={loading}
          >
            {initialTournament ? 'Modify Tournament' : 'Create Tournament'}
          </Button>
        </Col>
      </Row>
    </Form>
  );
};
