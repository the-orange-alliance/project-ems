import { FC, useCallback, useEffect, useRef, useState } from 'react';
import {
  Button,
  Card,
  Col,
  ColorPicker,
  Form,
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
import { PrepFieldSequenceEditor } from './prep-field-sequence-editor.js';

const { Option } = Select;

const GOAL_COLOR_FIELDS: {
  goal: keyof FGC26FCS.GoalScoreColors;
  label: string;
}[] = [
  { goal: 'red', label: 'Red SUPPRESSION UNIT' },
  { goal: 'center', label: 'EXTINGUISHER' },
  { goal: 'blue', label: 'Blue SUPPRESSION UNIT' }
];

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
      setLocalData({
        ...FGC26FCS.DEFAULT_SETTINGS,
        ...fcsData,
        // Merge per goal so a partially stored color set keeps the defaults for the rest
        goalScoreColors: {
          ...FGC26FCS.DEFAULT_SETTINGS.goalScoreColors,
          ...fcsData.goalScoreColors
        }
      });
    }
  }, [fcsData]);

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

  const handleGoalScoreColorChange = (
    goal: keyof FGC26FCS.GoalScoreColors,
    hex: string
  ) => {
    setLocalData((prev) => {
      const base = prev ?? FGC26FCS.DEFAULT_SETTINGS;
      const newData: FGC26FCS.SettingsType = {
        ...base,
        goalScoreColors: { ...base.goalScoreColors, [goal]: hex }
      };
      if (selectedField) {
        debouncedSave(selectedField, newData);
      }
      return newData;
    });
  };

  const applySequence = (sequence: FGC26FCS.PrepFieldStep[]) => {
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

  const handleSequenceReset = () => {
    applySequence(FGC26FCS.DEFAULT_SETTINGS.prepFieldSequence);
  };

  const fieldOptions =
    tournament?.fields?.map((field) => ({
      value: field,
      label: field
    })) || [];

  return (
    <div style={{ padding: 24 }}>
      <Space orientation='vertical' style={{ width: '100%' }}>
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
                    Steps the field robot runs on &quot;Prepare Field&quot;, in
                    order from top to bottom. A motor step runs the door or the
                    blowers at a power for a duration (seconds), then stops
                    them. A parallel group runs its branches at the same time.
                    Changes save automatically.
                  </Typography.Text>
                  <PrepFieldSequenceEditor
                    value={localData.prepFieldSequence}
                    onChange={applySequence}
                  />
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
          <Card title='Goal LED Colors' size='small'>
            <Row>
              {GOAL_COLOR_FIELDS.map(({ goal, label }) => (
                <Col span={12} key={goal}>
                  <Form.Item
                    label={label}
                    labelCol={{ span: 12 }}
                    wrapperCol={{ span: 12 }}
                    tooltip='Color of the lit (scored) LEDs on this goal.'
                  >
                    <ColorPicker
                      value={`#${localData.goalScoreColors[goal]}`}
                      onChange={(color) =>
                        handleGoalScoreColorChange(goal, color.toHex())
                      }
                      disabledAlpha
                      showText
                    />
                  </Form.Item>
                </Col>
              ))}
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
