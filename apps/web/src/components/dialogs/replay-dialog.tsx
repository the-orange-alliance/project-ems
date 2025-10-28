import { Modal, Button } from 'antd';
import { create, useModal } from '@ebay/nice-modal-react';

export const ReplayDialog = create(() => {
  const modal = useModal();

  const handleContinue = () => {
    modal.resolve(true);
    modal.hide();
  };

  const handleClose = () => {
    modal.resolve(false);
    modal.hide();
  };

  return (
    <Modal
      open={modal.visible}
      onCancel={handleClose}
      title='Replay Match'
      footer={[
        <Button key='continue' type='primary' danger onClick={handleContinue}>
          Yes, I want to replay the match
        </Button>,
        <Button key='cancel' onClick={handleClose}>
          Cancel
        </Button>
      ]}
      destroyOnClose
    >
      <p>
        It looks like this match has already been played. By continuing, you
        will replay the match and overwrite the previous results, which is an
        irreversible action.
      </p>
      <p>Are you sure you want to replay the match?</p>
    </Modal>
  );
});
