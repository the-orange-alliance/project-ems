import React, { useState, useEffect } from 'react';
import {
  Table,
  Input,
  Switch,
  Button,
  Form,
  Select,
  Card,
  Row,
  Col,
  Tooltip,
  message
} from 'antd';
import {
  SendOutlined,
  CopyOutlined,
  ClearOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import { Webhook, WebhookEvent } from '@toa-lib/models';
import {
  deleteWebhook,
  testWebhook,
  upsertWebhook,
  useWebhooks
} from 'src/api/use-webhook-data.js';

const WebhooksTab = () => {
  const { data: webhooks, mutate } = useWebhooks();
  const [localWebhooks, setLocalWebhooks] = useState<Webhook[]>(webhooks || []);
  const [newWebhook, setNewWebhook] = useState<Partial<Webhook>>({
    url: '',
    enabled: true,
    subscribedEvent: WebhookEvent.PRESTARTED,
    note: ''
  });
  // Keyed by webhook id for existing rows, or 'new' for the Add New Webhook
  // card, so only the button that was clicked shows a loading state.
  const [testingKey, setTestingKey] = useState<number | 'new' | null>(null);

  useEffect(() => {
    setLocalWebhooks(webhooks || []);
  }, [webhooks]);

  const updateWebhook = (index: number, field: keyof Webhook, value: any) => {
    const newWebhooks = [...localWebhooks];
    newWebhooks[index] = { ...newWebhooks[index], [field]: value };
    setLocalWebhooks(newWebhooks);
    handleUpdate(newWebhooks[index]);
  };

  const handleUpdate = async (webhook: Webhook) => {
    await upsertWebhook(webhook);
    mutate();
  };

  const handleDelete = async (id: number) => {
    await deleteWebhook(id);
    mutate();
  };

  const handleDuplicate = async (record: Webhook) => {
    // No `id`/error-tracking fields — this is a new, untested row, not a
    // continuation of the original's history.
    const duplicate: Partial<Webhook> = {
      url: record.url,
      enabled: record.enabled,
      subscribedEvent: record.subscribedEvent,
      field: record.field,
      note: record.note ? `${record.note} (copy)` : 'Copy'
    };
    await upsertWebhook(duplicate as Webhook);
    mutate();
    message.success('Webhook duplicated.');
  };

  const handleResetErrors = async (record: Webhook) => {
    const updated: Webhook = {
      ...record,
      errorCount: 0,
      lastErrorMessage: null,
      lastErrorTime: null
    };
    setLocalWebhooks((prev) =>
      prev.map((w) => (w.id === record.id ? updated : w))
    );
    await handleUpdate(updated);
    message.success('Error counter reset.');
  };

  const handleTest = async (
    key: number | 'new',
    url: string | undefined,
    event: WebhookEvent | undefined
  ) => {
    if (!url || !event) {
      message.error('Enter a URL and event before testing.');
      return;
    }
    setTestingKey(key);
    try {
      const result = await testWebhook(url, event);
      if (result.success) {
        message.success(
          `Test webhook delivered${result.status ? ` (${result.status})` : ''}.`
        );
      } else {
        message.error(
          `Test webhook failed: ${result.error || `${result.status} ${result.statusText}`}`
        );
      }
    } finally {
      setTestingKey(null);
    }
  };

  const handleAdd = async () => {
    await upsertWebhook(newWebhook as Webhook);
    mutate();
    setNewWebhook({
      url: '',
      enabled: true,
      subscribedEvent: WebhookEvent.PRESTARTED,
      note: ''
    });
  };

  const columns = [
    {
      title: 'Enabled',
      dataIndex: 'enabled',
      render: (checked: boolean, record: Webhook, index: number) => (
        <Switch
          checked={checked}
          onChange={(checked) => updateWebhook(index, 'enabled', checked)}
        />
      )
    },
    {
      title: 'Note',
      dataIndex: 'note',
      render: (text: string, record: Webhook, index: number) => (
        <Input
          value={text}
          onChange={(e) => updateWebhook(index, 'note', e.target.value)}
        />
      )
    },
    {
      title: 'URL',
      dataIndex: 'url',
      render: (text: string, record: Webhook, index: number) => (
        <Input
          value={text}
          onChange={(e) => updateWebhook(index, 'url', e.target.value)}
        />
      )
    },
    {
      title: 'Subscribed Event',
      dataIndex: 'subscribedEvent',
      render: (text: string, record: Webhook, index: number) => (
        <Select
          style={{ width: '100%' }}
          value={text}
          onChange={(value) => updateWebhook(index, 'subscribedEvent', value)}
          options={Object.values(WebhookEvent).map((event) => ({
            label: event,
            value: event
          }))}
        />
      )
    },
    {
      title: 'Subscribed Field (Blank for All)',
      dataIndex: 'field',
      render: (text: string, record: Webhook, index: number) => (
        <Input
          value={text}
          onChange={(e) => {
            const { value } = e.target;
            let parsed = value.trim() === '' ? null : parseInt(value, 10);
            if (parsed !== null && isNaN(parsed)) {
              parsed = null;
            }
            updateWebhook(index, 'field', parsed);
          }}
        />
      )
    },
    {
      title: 'Error Count',
      dataIndex: 'errorCount'
    },
    {
      title: 'Actions',
      render: (record: Webhook) => (
        <Row gutter={8} wrap={false}>
          <Col>
            <Tooltip title='Send a test payload to this URL'>
              <Button
                shape='circle'
                icon={<SendOutlined />}
                color='blue'
                variant='outlined'
                loading={testingKey === record.id}
                disabled={testingKey !== null && testingKey !== record.id}
                onClick={() =>
                  handleTest(record.id!, record.url, record.subscribedEvent)
                }
              />
            </Tooltip>
          </Col>
          <Col>
            <Tooltip title='Duplicate webhook'>
              <Button
                shape='circle'
                icon={<CopyOutlined />}
                color='purple'
                variant='outlined'
                onClick={() => handleDuplicate(record)}
              />
            </Tooltip>
          </Col>
          <Col>
            <Tooltip title='Reset error counter'>
              <Button
                shape='circle'
                icon={<ClearOutlined />}
                color='orange'
                variant='outlined'
                disabled={!record.errorCount}
                onClick={() => handleResetErrors(record)}
              />
            </Tooltip>
          </Col>
          <Col>
            <Tooltip title='Delete webhook'>
              <Button
                shape='circle'
                icon={<DeleteOutlined />}
                color='danger'
                variant='outlined'
                onClick={() => handleDelete(record.id!)}
              />
            </Tooltip>
          </Col>
        </Row>
      )
    }
  ];

  return (
    <div>
      <Card title='Add New Webhook' style={{ marginBottom: 16 }}>
        <Form layout='horizontal'>
          <Row gutter={16}>
            <Col span={18}>
              <Form.Item label='URL'>
                <Input
                  value={newWebhook.url}
                  onChange={(e) =>
                    setNewWebhook({ ...newWebhook, url: e.target.value })
                  }
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label='Enabled'>
                <Switch
                  checked={newWebhook.enabled}
                  onChange={(checked) =>
                    setNewWebhook({ ...newWebhook, enabled: checked })
                  }
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label='Event'>
                <Select
                  value={newWebhook.subscribedEvent}
                  onChange={(value) =>
                    setNewWebhook({ ...newWebhook, subscribedEvent: value })
                  }
                  options={Object.values(WebhookEvent).map((event) => ({
                    label: event,
                    value: event
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label='Note'>
                <Input
                  value={newWebhook.note || ''}
                  onChange={(e) =>
                    setNewWebhook({ ...newWebhook, note: e.target.value })
                  }
                />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            labelCol={{ span: 0 }}
            wrapperCol={{ span: 24, style: { textAlign: 'right' } }}
          >
            <Button
              style={{ marginRight: 8 }}
              loading={testingKey === 'new'}
              disabled={testingKey !== null && testingKey !== 'new'}
              onClick={() =>
                handleTest('new', newWebhook.url, newWebhook.subscribedEvent)
              }
            >
              Send Test
            </Button>
            <Button type='primary' onClick={handleAdd}>
              Add Webhook
            </Button>
          </Form.Item>
        </Form>
      </Card>
      <Card title='Existing Webhooks'>
        <Table
          columns={columns}
          dataSource={localWebhooks}
          rowKey='id'
          pagination={false}
        />
      </Card>
    </div>
  );
};

export default WebhooksTab;
