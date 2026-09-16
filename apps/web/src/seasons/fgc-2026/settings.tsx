import { FC, useCallback, useEffect, useRef, useState } from 'react';
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Typography,
  message
} from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import { FGC26FCS } from '@toa-lib/models';
import { fcsApi, useFcsData } from 'src/api/use-fcs-data.js';
import { useCurrentTournament } from 'src/api/use-tournament-data.js';
import { useSocketWorker } from 'src/api/use-socket-worker.js';

const { Option } = Select;

export const Settings: FC = () => {
  const tournament = useCurrentTournament();
  const { worker } = useSocketWorker();
  const [selectedField, setSelectedField] = useState<string>('');
  const fieldNum = parseInt(selectedField.match(/\d+/)?.[0] ?? '', 10);
  const { data: fcsData, mutate } = useFcsData<Partial<FGC26FCS.SettingsType>>(
    Number.isNaN(fieldNum) ? '' : fieldNum
  );
  const [localData, setLocalData] = useState<FGC26FCS.SettingsType>();
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef<number | null>(null);
  const [sequenceText, setSequenceText] = useState('');
  const [sequenceError, setSequenceError] = useState<string | null>(null);
  const sequenceSyncedFieldRef = useRef<string>('');

  useEffect(() => {
    if (tournament?.fields && tournament.fields.length > 0 && !selectedField) {
      setSelectedField(tournament.fields[0]);
    }
  }, [tournament, selectedField]);

  useEffect(() => {
    if (fcsData) {
      // The shared FCS settings endpoint returns the previous season's default shape
      // when a field has never been configured, so merge onto our own defaults rather
      // than trusting the raw payload's shape.
      setLocalData({ ...FGC26FCS.DEFAULT_SETTINGS, ...fcsData });
    }
  }, [fcsData]);

  // Sync the sequence editor text once per selected field, so saves/refetches
  // don't reformat the JSON out from under the user while they type.
  useEffect(() => {
    if (localData && selectedField && sequenceSyncedFieldRef.current !== selectedField) {
      sequenceSyncedFieldRef.current = selectedField;
      setSequenceText(JSON.stringify(localData.prepFieldSequence, null, 2));
      setSequenceError(null);
    }
  }, [localData, selectedField]);

  const saveSettings = useCallback(
    async (field: string, data: FGC26FCS.SettingsType) => {
      if (!field || !data || isSaving) return;

      const fieldNum = parseInt(field.match(/\d+/)?.[0] ?? '', 10);

      setIsSaving(true);
      try {
        await fcsApi.update.settings(fieldNum, data);

        if (worker) {
          worker.emit('fcs:settings', {
            field: fieldNum,
            data,
            timestamp: Date.now()
          });
        }

        mutate();
      } catch (error) {
        console.error('Auto-save error:', error);
        message.error('Failed to save settings automatically');
      } finally {
        setIsSaving(false);
      }
    },
    [worker, mutate, isSaving]
  );

  const debouncedSave = useCallback(
    (field: string, data: FGC26FCS.SettingsType) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        saveSettings(field, data);
      }, 1000);
    },
    [saveSettings]
  );

  const handleRatioChange = (value: number | null) => {
    const wildfireBallsPerLed = value && value >= 1 ? Math.floor(value) : 1;
    setLocalData((prev) => {
      const newData: FGC26FCS.SettingsType = {
        ...(prev ?? FGC26FCS.DEFAULT_SETTINGS),
        wildfireBallsPerLed
      };
      if (selectedField) {
        debouncedSave(selectedField, newData);
      }
      return newData;
    });
  };

  const handleExtinguisherVisibilityChange = (
    extinguisherVisibility: FGC26FCS.ExtinguisherVisibility
  ) => {
    setLocalData((prev) => {
      const newData: FGC26FCS.SettingsType = {
        ...(prev ?? FGC26FCS.DEFAULT_SETTINGS),
        extinguisherVisibility
      };
      if (selectedField) {
        debouncedSave(selectedField, newData);
      }
      return newData;
    });
  };

  const applySequence = (sequence: FGC26FCS.PrepFieldStep[]) => {
    setSequenceError(null);
    setLocalData((prev) => {
      const newData: FGC26FCS.SettingsType = {
        ...(prev ?? FGC26FCS.DEFAULT_SETTINGS),
        prepFieldSequence: sequence
      };
      if (selectedField) {
        debouncedSave(selectedField, newData);
      }
      return newData;
    });
  };

  const handleSequenceTextChange = (text: string) => {
    setSequenceText(text);

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch (error) {
      setSequenceError(`Invalid JSON: ${(error as Error).message}`);
      return;
    }

    const validationError = FGC26FCS.validatePrepFieldSequence(parsed);
    if (validationError) {
      // Never save an invalid sequence - the robot keeps its last known good
      // sequence, but a reconnecting robot would fetch the poisoned row.
      setSequenceError(validationError);
      return;
    }

    applySequence(parsed as FGC26FCS.PrepFieldStep[]);
  };

  const handleSequenceReset = () => {
    const sequence = FGC26FCS.DEFAULT_SETTINGS.prepFieldSequence;
    setSequenceText(JSON.stringify(sequence, null, 2));
    applySequence(sequence);
  };

  const sequenceDuration =
    !sequenceError && localData
      ? FGC26FCS.prepFieldSequenceDuration(localData.prepFieldSequence)
      : null;

  const fieldOptions =
    tournament?.fields?.map((field) => ({
      value: field,
      label: field
    })) || [];

  return (
    <div style={{ padding: 24 }}>
      <Space direction='vertical' style={{ width: '100%' }}>
        <Card>
          <Typography.Title level={5}>
            Igniting Innovation Field Settings
          </Typography.Title>
          <Space direction='vertical' style={{ width: '100%' }}>
            {selectedField && localData && (
              <Card
                title='Prep Field Sequence'
                size='small'
                extra={
                  <Button onClick={handleSequenceReset}>
                    Reset to default
                  </Button>
                }
              >
                <Space direction='vertical' style={{ width: '100%' }}>
                  <Typography.Text type='secondary'>
                    JSON array of steps the field robot runs on &quot;Prepare
                    Field&quot;. Steps run in order:{' '}
                    <Typography.Text code>
                      {'{"type":"motor","motor":"door"|"blowers","power":0.25,"duration":1.0}'}
                    </Typography.Text>{' '}
                    runs a motor at a power for a duration (seconds) then stops
                    it,{' '}
                    <Typography.Text code>
                      {'{"type":"wait","duration":1.0}'}
                    </Typography.Text>{' '}
                    pauses, and{' '}
                    <Typography.Text code>
                      {'{"type":"parallel","branches":[[...],[...]]}'}
                    </Typography.Text>{' '}
                    runs several step lists at the same time. Changes only save
                    when the sequence is valid.
                  </Typography.Text>
                  <Input.TextArea
                    value={sequenceText}
                    onChange={(e) => handleSequenceTextChange(e.target.value)}
                    autoSize={{ minRows: 8, maxRows: 24 }}
                    spellCheck={false}
                    style={{ fontFamily: 'monospace' }}
                    status={sequenceError ? 'error' : undefined}
                  />
                  {sequenceError ? (
                    <Typography.Text type='danger'>
                      {sequenceError}
                    </Typography.Text>
                  ) : (
                    sequenceDuration !== null && (
                      <Typography.Text type='secondary'>
                        Nominal sequence duration: {sequenceDuration.toFixed(1)}
                        s
                      </Typography.Text>
                    )
                  )}
                </Space>
              </Card>
            )}
          </Space>
        </Card>

        <Form layout='vertical'>
          <Form.Item label='Select Field'>
            <Select
              value={selectedField}
              onChange={setSelectedField}
              style={{ width: 200 }}
              placeholder='Select a field'
            >
              {fieldOptions.map((option) => (
                <Option key={option.value} value={option.value}>
                  {option.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Form>

        {selectedField && localData && (
          <Card title='WILDFIRE Conversion' size='small'>
            <Row>
              <Col span={12}>
                <Form.Item
                  label='Balls per LED'
                  labelCol={{ span: 12 }}
                  wrapperCol={{ span: 12 }}
                  tooltip='How many balls each lit WILDFIRE LED represents on this field. Must be a whole number, 1 or greater.'
                >
                  <InputNumber
                    value={localData.wildfireBallsPerLed}
                    onChange={handleRatioChange}
                    min={1}
                    step={1}
                    precision={0}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
            </Row>
          </Card>
        )}

        {selectedField && localData && (
          <Card title='Referee Tablets' size='small'>
            <Row>
              <Col span={12}>
                <Form.Item
                  label='EXTINGUISHER visibility'
                  labelCol={{ span: 12 }}
                  wrapperCol={{ span: 12 }}
                  tooltip='Which alliance referee tablet(s) show the EXTINGUISHER LED/ball calculator in the TeleOp tab. The head referee always keeps their own EXTINGUISHER control regardless of this setting.'
                >
                  <Select
                    value={localData.extinguisherVisibility}
                    onChange={handleExtinguisherVisibilityChange}
                    style={{ width: '100%' }}
                  >
                    <Option value='both'>Both</Option>
                    <Option value='red'>Red</Option>
                    <Option value='blue'>Blue</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          </Card>
        )}

        {isSaving && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '16px',
              color: '#1890ff'
            }}
          >
            <LoadingOutlined spin style={{ marginRight: 8 }} />
            <Typography.Text>Saving settings...</Typography.Text>
          </div>
        )}

        {!selectedField && (
          <Card>
            <Typography.Text type='secondary'>
              Please select a field to view and edit FCS settings.
            </Typography.Text>
          </Card>
        )}
      </Space>
    </div>
  );
};
