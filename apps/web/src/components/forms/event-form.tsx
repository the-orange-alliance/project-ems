import { ChangeEvent, FC, useEffect, useState } from 'react';
import { Row, Col, Input, Form, Button, DatePicker } from 'antd';
import { SeasonDropdown } from 'src/components/dropdowns/season-dropdown.js';
import { EventTypeDropdown } from 'src/components/dropdowns/event-type-dropdown.js';
import { Event, defaultEvent } from '@toa-lib/models';
import dayjs from 'dayjs';
import { ViewReturn } from '../buttons/view-return.js';

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
    <Col xs={24} sm={12} md={8}>
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

interface Props {
  initialEvent?: Event | null;
  onSubmit?: (event: Event) => void;
  loading?: boolean;
  returnTo?: string;
}

export const EventForm: FC<Props> = ({
  initialEvent,
  onSubmit,
  loading,
  returnTo
}) => {
  const [event, setEvent] = useState({ ...(initialEvent ?? defaultEvent) });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialEvent) setEvent(initialEvent);
  }, [initialEvent]);

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!event.eventName?.trim()) next.eventName = 'Event Name is required.';
    if (!event.seasonKey?.trim()) next.seasonKey = 'Season is required.';
    if (!event.eventKey?.trim()) next.eventKey = 'Event Key is required.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = () => {
    if (!event) return;
    if (!validate()) return;
    onSubmit?.(event);
  };

  const clearError = (name: string) =>
    setErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { type, name, value } = e.target;
    clearError(name);
    setEvent((prev) => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value) : value
    }));
  };

  const handleSeasonChange = (seasonKey: string) => {
    if (!event) return;
    clearError('seasonKey');
    clearError('eventKey');
    setEvent({
      ...event,
      seasonKey,
      eventKey: `${seasonKey}-${event.regionKey}-`.toUpperCase()
    });
  };

  const handleRegionChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!event) return;
    const { value } = e.target;
    setEvent({
      ...event,
      regionKey: value.toUpperCase(),
      eventKey: `${event.seasonKey}-${value}-`.toUpperCase()
    });
  };

  return (
    <Form layout='vertical'>
      <Row gutter={16}>
        <FormField
          name='eventName'
          label='Event Name'
          value={event.eventName}
          onChange={handleChange}
          disabled={loading}
          required
          error={errors.eventName}
        />
        <Col xs={24} sm={12} md={8}>
          <Form.Item
            label='Season'
            required
            validateStatus={errors.seasonKey ? 'error' : undefined}
            help={errors.seasonKey}
          >
            <SeasonDropdown
              value={event.seasonKey}
              onChange={handleSeasonChange}
              disabled={!!initialEvent || loading}
            />
          </Form.Item>
        </Col>
        <FormField
          name='regionKey'
          label='Region'
          value={event.regionKey}
          onChange={handleRegionChange}
          disabled={!!initialEvent || loading}
        />
        <FormField
          name='eventKey'
          label='Event Key'
          value={event.eventKey}
          onChange={handleChange}
          disabled={!!initialEvent || loading}
          required
          error={errors.eventKey}
        />
        <FormField
          name='divisionName'
          label='Division Name'
          value={event.divisionName}
          onChange={handleChange}
          disabled={loading}
        />
        <Col xs={24} sm={12} md={8}>
          <Form.Item label='Event Type'>
            <EventTypeDropdown
              value={event.eventTypeKey}
              onChange={(eventTypeKey) =>
                setEvent((prev) => ({ ...prev, eventTypeKey }))
              }
              disabled={loading}
            />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Form.Item label='Start Date'>
            <DatePicker
              value={dayjs(event.startDate)}
              format={'dddd, DD MMMM YYYY, hh:mma'}
              onChange={(startDate) =>
                setEvent((prev) => ({
                  ...prev,
                  startDate: startDate
                    ? startDate.toISOString()
                    : prev.startDate
                }))
              }
              style={{ width: '100%' }}
              showTime
              disabled={loading}
              size='large'
            />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Form.Item label='End Date'>
            <DatePicker
              value={dayjs(event.endDate)}
              format={'dddd, DD MMMM YYYY, hh:mma'}
              showTime
              onChange={(endDate) =>
                setEvent((prev) => ({
                  ...prev,
                  endDate: endDate ? endDate.toISOString() : prev.endDate
                }))
              }
              style={{ width: '100%' }}
              disabled={loading}
              size='large'
            />
          </Form.Item>
        </Col>
        <FormField
          name='venue'
          label='Venue'
          value={event.venue}
          onChange={handleChange}
          disabled={loading}
        />
        <FormField
          name='city'
          label='City'
          value={event.city}
          onChange={handleChange}
          disabled={loading}
        />
        <FormField
          name='stateProv'
          label='State/Province'
          value={event.stateProv}
          onChange={handleChange}
          disabled={loading}
        />
        <FormField
          name='country'
          label='Country'
          value={event.country}
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
            {initialEvent ? 'Modify Event' : 'Create Event'}
          </Button>
        </Col>
      </Row>
    </Form>
  );
};
