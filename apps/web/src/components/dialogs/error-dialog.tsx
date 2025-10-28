import { Modal, Button } from 'antd';
import { create, useModal } from '@ebay/nice-modal-react';

interface Props {
  message: string;
}

export const ErrorDialog = create(({ message }: Props) => {
  const modal = useModal();
  const handleClose = () => {
    modal.resolve(false);
    modal.hide();
  };
  return (
    <Modal
      open={modal.visible}
      onCancel={handleClose}
      title='Application Error'
      footer={[
        <Button key='ok' type='primary' onClick={handleClose}>
          Okay
        </Button>
      ]}
      destroyOnClose
    >
      <p>{message}</p>
    </Modal>
  );
});
