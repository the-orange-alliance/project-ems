import { Modal, Typography, Button } from 'antd';
import { create, useModal, antdModalV5 } from '@ebay/nice-modal-react';
import { Team } from '@toa-lib/models';

const { Text } = Typography;

interface Props {
  team: Team;
}

export const TeamRemovalDialog = create(({ team }: Props) => {
  const modal = useModal();

  const handleOk = () => {
    modal.resolve(true);
    modal.hide();
  };

  const handleCancel = () => {
    modal.resolve(false);
    modal.hide();
  };

  return (
    <Modal
      {...antdModalV5(modal)}
      open={modal.visible}
      onOk={handleOk}
      onCancel={handleCancel}
      centered
      title={
        <div
          style={{
            padding: '12px 24px',
            margin: '-16px -24px 16px -24px'
          }}
        >
          Team Removal
        </div>
      }
      footer={[
        <Button key='yes' type='primary' onClick={handleOk}>
          Yes
        </Button>,
        <Button key='no' onClick={handleCancel}>
          No
        </Button>
      ]}
    >
      <Text>
        Are you sure you want to remove <b>{team.teamNameLong}</b> from event
        registration?
      </Text>
    </Modal>
  );
});
