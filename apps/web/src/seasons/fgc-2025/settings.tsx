import { FC, useState, useEffect, useCallback, useRef } from 'react';
import {
  Select,
  Card,
  Input,
  InputNumber,
  Form,
  Space,
  message,
  Row,
  Col,
  Typography,
  Collapse
} from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import { updateFcsData, useFcsData } from 'src/api/use-fcs-data.js';
import { useCurrentTournament } from 'src/api/use-tournament-data.js';
import { useSocketWorker } from 'src/api/use-socket-worker.js';
import { FGC25FCS } from '@toa-lib/models';

const { Option } = Select;
const { Panel } = Collapse;

interface SettingFieldProps {
  label: string;
  value: any;
  onChange: (value: any) => void;
  type?: 'number' | 'string' | 'color' | 'boolean';
  step?: number;
  description?: string;
}

const SettingField: FC<SettingFieldProps> = ({
  label,
  value,
  onChange,
  type = 'number',
  step = 0.01,
  description
}) => {
  const renderInput = () => {
    switch (type) {
      case 'string':
        return (
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={`Enter ${label.toLowerCase()}`}
          />
        );
      case 'color':
        return (
          <Input
            type='color'
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={{ width: '60px', height: '32px', padding: '0' }}
          />
        );
      case 'boolean':
        return (
          <Select value={value} onChange={onChange} style={{ width: '100px' }}>
            <Option value={true}>True</Option>
            <Option value={false}>False</Option>
          </Select>
        );
      default:
        return (
          <InputNumber
            value={value}
            onChange={onChange}
            style={{ width: '100%' }}
            step={step}
          />
        );
    }
  };

  return (
    <Form.Item
      label={label}
      labelCol={{ span: 8 }}
      wrapperCol={{ span: 16 }}
      tooltip={description}
    >
      {renderInput()}
    </Form.Item>
  );
};

interface SettingsGroupProps {
  title: string;
  data: any;
  onChange: (key: string, value: any) => void;
  fieldDefinitions?: Record<string, { type?: string; description?: string }>;
}

const SettingsGroup: FC<SettingsGroupProps> = ({
  title,
  data,
  onChange,
  fieldDefinitions = {}
}) => {
  if (!data || typeof data !== 'object') return null;

  const renderField = (key: string, value: any) => {
    if (typeof value === 'object' && value !== null) {
      return (
        <SettingsGroup
          key={key}
          title={key}
          data={value}
          onChange={(nestedKey, nestedValue) => {
            onChange(key, { ...value, [nestedKey]: nestedValue });
          }}
          fieldDefinitions={fieldDefinitions}
        />
      );
    }

    const fieldDef = fieldDefinitions[key] || {};
    const type =
      fieldDef.type ||
      (typeof value === 'string' && value.startsWith('#')
        ? 'color'
        : typeof value === 'string'
          ? 'string'
          : typeof value === 'boolean'
            ? 'boolean'
            : 'number');

    return (
      <SettingField
        key={key}
        label={key
          .replace(/([A-Z])/g, ' $1')
          .replace(/^./, (str) => str.toUpperCase())}
        value={value}
        onChange={(newValue) => onChange(key, newValue)}
        type={type as any}
        description={fieldDef.description}
      />
    );
  };

  return (
    <Card title={title} size='small' style={{ marginBottom: 16 }}>
      <Row gutter={16}>
        {Object.entries(data).map(([key, value]) => (
          <Col span={12} key={key}>
            {renderField(key, value)}
          </Col>
        ))}
      </Row>
    </Card>
  );
};

interface ConstantsSectionProps {
  title: string;
  data: any;
  onChange: (key: string, value: any) => void;
}

const ConstantsSection: FC<ConstantsSectionProps> = ({
  title,
  data,
  onChange
}) => {
  const getFieldDefinitions = (sectionName: string) => {
    const definitions: Record<string, { type?: string; description?: string }> =
      {};

    switch (sectionName) {
      case 'BallDispenserConstants':
        definitions.kBlueOuttakeId = {
          description: 'CAN ID for blue alliance outtake motor'
        };
        definitions.kBlueTornadoLeaderId = {
          description: 'CAN ID for blue tornado leader motor'
        };
        definitions.kBlueTornadoFollowerId = {
          description: 'CAN ID for blue tornado follower motor'
        };
        definitions.kRedOuttakeId = {
          description: 'CAN ID for red alliance outtake motor'
        };
        definitions.kRedTornadoLeaderId = {
          description: 'CAN ID for red tornado leader motor'
        };
        definitions.kRedTornadoFollowerId = {
          description: 'CAN ID for red tornado follower motor'
        };
        break;
      case 'PillarConstants':
        definitions.kBackId = {
          description: 'CAN ID for back pillar motor'
        };
        definitions.kBlueId = {
          description: 'CAN ID for blue pillar motor'
        };
        definitions.kRedId = {
          description: 'CAN ID for red pillar motor'
        };
        definitions.kBackWledAddress = {
          type: 'string',
          description: 'WLED address for back pillar'
        };
        definitions.kBlueWledAddress = {
          type: 'string',
          description: 'WLED address for blue pillar'
        };
        definitions.kRedWledAddress = {
          type: 'string',
          description: 'WLED address for red pillar'
        };
        definitions.kNegativeSpaceColor = {
          type: 'color',
          description: 'Color for unscored zones'
        };
        definitions.kScorableZoneColor = {
          type: 'color',
          description: 'Color for scorable zones'
        };
        definitions.kScoredColor = {
          type: 'color',
          description: 'Color for scored zones'
        };
        break;
      case 'FlowControllerConstants':
        definitions.kBlueWledAddress = {
          type: 'string',
          description: 'WLED address for blue flow controller'
        };
        definitions.kRedWledAddress = {
          type: 'string',
          description: 'WLED address for red flow controller'
        };
        definitions.kFlowRateColor = {
          type: 'color',
          description: 'Color indicating flow rate'
        };
        definitions.kNegativeSpaceColor = {
          type: 'color',
          description: 'Color for inactive zones'
        };
        break;
      case 'FCSConstants':
        definitions.kFCSAddress = {
          type: 'string',
          description: 'Network address for FCS controller'
        };
        break;
    }

    return definitions;
  };

  return (
    <SettingsGroup
      title={title}
      data={data}
      onChange={onChange}
      fieldDefinitions={getFieldDefinitions(title)}
    />
  );
};

export const Settings: FC = () => {
  const tournament = useCurrentTournament();
  const { worker } = useSocketWorker();
  const [selectedField, setSelectedField] = useState<string>('');
  const { data: fcsData, mutate } = useFcsData(
    parseInt(selectedField.match(/\d+/)?.[0] ?? '', 10)
  );
  const [localData, setLocalData] = useState<FGC25FCS.SettingsType>();
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (tournament?.fields && tournament.fields.length > 0 && !selectedField) {
      setSelectedField(tournament.fields[0]);
    }
  }, [tournament, selectedField]);

  useEffect(() => {
    if (fcsData) {
      setLocalData(fcsData);
    }
  }, [fcsData]);

  const saveSettings = useCallback(
    async (field: string, data: any) => {
      if (!field || !data || isSaving) return;

      const fieldNum = parseInt(field.match(/\d+/)?.[0] ?? '', 10);

      setIsSaving(true);
      try {
        // Save to API
        await updateFcsData(fieldNum, data);

        // Emit socket event to notify other clients
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
    (field: string, data: any) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        saveSettings(field, data);
      }, 1000); // 1 second debounce
    },
    [saveSettings]
  );

  const handleDataChange = (
    section: keyof FGC25FCS.SettingsType,
    value: any
  ) => {
    setLocalData((prev: any) => {
      const newData = { ...prev, [section]: value };
      if (selectedField) {
        debouncedSave(selectedField, newData);
      }
      return newData;
    });
  };

  const fieldOptions =
    tournament?.fields?.map((field) => ({
      value: field,
      label: field
    })) || [];

  // helper types
  type SectionKey = keyof FGC25FCS.SettingsType;
  type Section<K extends SectionKey> = {
    key: K;
    title: string;
    data: FGC25FCS.SettingsType[K] | undefined;
  };

  // helper to preserve per-item key->data relationship when building the array
  const makeSection = <K extends SectionKey>(s: Section<K>) => s;

  const sections = [
    makeSection({
      key: 'kEStopDioChannel',
      title: 'Emergency Stop',
      data: localData?.kEStopDioChannel
    }),
    makeSection({
      key: 'matchStateColors',
      title: 'Match State Colors',
      data: localData?.matchStateColors
    }),
    makeSection({
      key: 'dispenserSettings',
      title: 'Dispensers',
      data: localData?.dispenserSettings
    }),
    makeSection({
      key: 'ecosystemSettings',
      title: 'Ecosystems',
      data: localData?.ecosystemSettings
    }),
    makeSection({
      key: 'acceleratorSettings',
      title: 'Accelerators',
      data: localData?.acceleratorSettings
    })
  ];

  console.log(sections, localData);

  return (
    <div style={{ padding: 24 }}>
      <Space direction='vertical' style={{ width: '100%' }}>
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
          <>
            <Collapse defaultActiveKey={['emergency', 'ball-dispenser']} ghost>
              {sections.map(
                (section) =>
                  typeof section.data !== 'undefined' && (
                    <Panel
                      header={section.title}
                      key={section.key
                        .toLowerCase()
                        .replace('constants', '')
                        .replace('k', '')}
                    >
                      {section.key === 'kEStopDioChannel' ? (
                        <Row>
                          <Col span={12}>
                            <SettingField
                              label='Emergency Stop DIO Channel'
                              value={section.data}
                              onChange={(value) =>
                                handleDataChange(section.key, value)
                              }
                              step={1}
                              description='Digital I/O channel for emergency stop button'
                            />
                          </Col>
                        </Row>
                      ) : (
                        <ConstantsSection
                          title={section.title}
                          data={section.data}
                          onChange={(key, value) =>
                            handleDataChange(section.key, {
                              ...section.data,
                              [key]: value
                            })
                          }
                        />
                      )}
                    </Panel>
                  )
              )}
            </Collapse>

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
          </>
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
