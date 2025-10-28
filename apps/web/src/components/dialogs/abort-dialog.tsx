import { Modal, Button } from 'antd';
import { create, useModal } from '@ebay/nice-modal-react';

export const AbortDialog = create(() => {
  const modal = useModal();

  const handleAbort = () => {
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
      footer={[
        <Button key='abort' type='primary' danger onClick={handleAbort}>
          Abort
        </Button>,
        <Button key='cancel' onClick={handleClose}>
          Cancel
        </Button>
      ]}
      title='Match Procedure'
    >
      <p>
        Aborting a match is a serious action which stops the match and
        interrupts event flow. This should only be done under serious
        circumstances or emergencies.
      </p>
      <p>Are you sure you want to abort the match?</p>
    </Modal>
  );
});
