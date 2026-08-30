import { FC, useEffect, useState } from 'react';
import { Typography, Button, Checkbox, Input, Modal, Space, Table } from 'antd';
import { PaperLayout } from '@layouts/paper-layout.js';
import { useSocketWorker } from 'src/api/use-socket-worker.js';
import {
  DeleteOutlined,
  EyeOutlined,
  LeftOutlined,
  ReloadOutlined,
  SyncOutlined
} from '@ant-design/icons';
import { socketApi } from 'src/api/use-socket-data.js';
import { Link } from 'react-router-dom';

export const AudienceDisplayManager: FC = () => {
  // TODO - Sorry @Soren you'll need to fix this ¯\_(ツ)_/¯
  const [clients, setClients] = useState<any[]>([]);
  // const resetClients = useResetRecoilState(socketClientsSelector);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogContext, setDialogContext] = useState<any>(null);
  const { events } = useSocketWorker();

  // Add effect to invalidate the clients atom when the component is unmounted
  useEffect(() => {
    return () => {
      setClients([]);
    };
  }, []);

  const handleClose = () => {
    setDialogOpen(false);
  };

  const openDialog = (context: any) => {
    setDialogOpen(true);
    setDialogContext(context);
  };

  const updateContext = (key: string, value: string | number) => {
    if (!dialogContext) return;
    setDialogContext({ ...dialogContext, [key]: value });
  };

  const saveUpdate = () => {
    if (!dialogContext) return;
    setDialogOpen(false);
    events.sendUpdateSocketClient(dialogContext);
    socketApi.update.client(dialogContext.persistantClientId, dialogContext);
    const cpy = [...clients];
    const id = cpy.findIndex(
      (e) => e.persistantClientId === dialogContext.persistantClientId
    );
    cpy[id] = dialogContext;
    setClients(cpy);
  };

  const refreshClients = async () => {
    setClients([]);
    // resetClients();
  };

  const requestClientToIdentify = (data: any) => {
    events.requestClientIdentification(data);
  };

  const deleteDevice = (id: string) => {
    socketApi.delete.client(id);
    const cpy = [...clients];
    const index = cpy.findIndex((e) => e.persistantClientId === id);
    cpy.splice(index, 1);
    setClients(cpy);
  };

  const idAll = () => {
    events.requestAllClientsIdentification({ clients });
  };

  const columns = [
    { title: 'ID', dataIndex: 'persistantClientId', key: 'id' },
    { title: 'IP Address', dataIndex: 'ipAddress', key: 'ipAddress' },
    {
      title: 'Connetcted',
      key: 'connected',
      render: (_: any, client: any) => (client.connected ? 'Yes' : 'No')
    },
    { title: 'Socket ID', dataIndex: 'lastSocketId', key: 'lastSocketId' },
    {
      title: 'Chroma Key',
      key: 'chroma',
      render: (_: any, client: any) =>
        client.audienceDisplayChroma?.replaceAll('"', '')
    },
    { title: 'Field Numbers', dataIndex: 'fieldNumbers', key: 'fieldNumbers' },
    {
      title: 'Follower Mode Enabled',
      key: 'followerMode',
      render: (_: any, client: any) => (client.followerMode ? 'Yes' : 'No')
    },
    {
      title: 'Identify',
      key: 'identify',
      render: (_: any, client: any) => (
        <Button
          type='text'
          icon={<EyeOutlined />}
          onClick={(e) => {
            requestClientToIdentify(client);
            e.stopPropagation();
          }}
        />
      )
    },
    {
      title: 'Force Reload',
      key: 'reload',
      render: (_: any, client: any) => (
        <Button
          type='text'
          icon={<SyncOutlined />}
          onClick={(e) => {
            events.requestClientRefresh(client);
            e.stopPropagation();
          }}
        />
      )
    },
    {
      title: 'Delete',
      key: 'delete',
      render: (_: any, client: any) => (
        <Button
          type='text'
          danger
          icon={<DeleteOutlined />}
          onClick={(e) => {
            deleteDevice(client.persistantClientId);
            e.stopPropagation();
          }}
        />
      )
    }
  ];

  return (
    <PaperLayout
      containerWidth='xl'
      header={
        <Typography.Title level={4}>Audience Display Manager</Typography.Title>
      }
      padding
    >
      <Space style={{ width: '100%', justifyContent: 'space-between' }} wrap>
        <Link to='../'>
          <Button icon={<LeftOutlined />}>Back</Button>
        </Link>
        <Space>
          <Button
            icon={<ReloadOutlined />}
            type='primary'
            onClick={refreshClients}
          >
            Refresh Clients
          </Button>
          <Button icon={<EyeOutlined />} type='primary' onClick={idAll}>
            Identify All Devices
          </Button>
        </Space>
      </Space>
      <Table
        size='small'
        rowKey='persistantClientId'
        columns={columns}
        dataSource={clients}
        pagination={false}
        onRow={(client) => ({ onClick: () => openDialog(client) })}
      />

      {dialogContext && ( // TODO: make field numbers more pretty
        <Modal
          open={dialogOpen}
          onCancel={handleClose}
          title={`Update ${dialogContext.persistantClientId}`}
          footer={[
            <Button key='cancel' onClick={handleClose}>
              Cancel
            </Button>,
            <Button key='update' type='primary' onClick={saveUpdate}>
              Update
            </Button>
          ]}
        >
          <Space direction='vertical' style={{ width: '100%' }}>
            <Input
              placeholder='Audience Display Chroma'
              defaultValue={dialogContext.audienceDisplayChroma?.replaceAll(
                '"',
                ''
              )}
              onChange={(e) =>
                updateContext('audienceDisplayChroma', e.target.value)
              }
            />
            <Input
              placeholder='Field Numbers (Seperated by commas)'
              defaultValue={dialogContext.fieldNumbers}
              onChange={(e) => updateContext('fieldNumbers', e.target.value)}
            />
            <Checkbox
              defaultChecked={!!dialogContext.followerMode}
              onChange={(e) =>
                updateContext('followerMode', e.target.checked ? 1 : 0)
              }
            >
              Enable Follower Mode
            </Checkbox>
            <Input
              placeholder='Follower API Host (Leave blank for none)'
              defaultValue={dialogContext.followerApiHost}
              onChange={(e) => updateContext('followerApiHost', e.target.value)}
            />
          </Space>
        </Modal>
      )}
    </PaperLayout>
  );
};
