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
  Col
} from 'antd';
import { Webhook, WebhookEvent } from '@toa-lib/models';
import {
  deleteWebhook,
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
      title: 'Actions',
      render: (record: Webhook) => (
        <Button danger onClick={() => handleDelete(record.id!)}>
          Delete
        </Button>
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
