import { Button, Modal, Typography } from 'antd';
import { useModal, create } from '@ebay/nice-modal-react';

interface Props {
  level: string;
}

export const ForceConfirm = create(({ level }: Props) => {
  const modal = useModal();

  const hadleDoIt = () => {
    modal.resolve(true);
    modal.hide();
  };

  const handleClose = () => {
    modal.resolve(false);
    modal.hide();
  };

  const str =
    level === '4'
      ? '0-1 Barriers Remain'
      : `${5 - parseInt(level)} Barriers Remain`;

  return (
    <Modal
      open={modal.visible}
      onCancel={handleClose}
      title='Are you sure?'
      footer={[
        <Button key='abort' type='primary' danger onClick={hadleDoIt}>
          Yes, force to {str}
        </Button>,
        <Button key='cancel' onClick={handleClose}>
          Cancel
        </Button>
      ]}
    >
      <Typography.Text>
        Are you sure you want to force this tower to {str}?
      </Typography.Text>
    </Modal>
  );
});
