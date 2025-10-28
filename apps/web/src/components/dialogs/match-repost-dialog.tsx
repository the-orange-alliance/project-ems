import { Modal, Button } from 'antd';
import { create, useModal } from '@ebay/nice-modal-react';

const MatchRepostDialog = create(() => {
  const handleAbort = () => {
    modal.resolve(true);
    modal.hide();
  };
  const modal = useModal();
  const handleClose = () => {
    modal.resolve(false);
    modal.hide();
  };
  return (
    <Modal
      open={modal.visible}
      onCancel={handleClose}
      title='Repost Match'
      footer={[
        <Button key='overwrite' type='primary' danger onClick={handleAbort}>
          Yes, Overwrite
        </Button>,
        <Button key='cancel' onClick={handleClose}>
          Cancel
        </Button>
      ]}
      destroyOnClose
    >
      <p>This match will have its updates committed and posted.</p>
      <p>
        Reposting this match will overwrite the existing match (including all
        scores, participants, and details), and stop any currently in-progress
        matches.
      </p>
      <p>Are you sure you want to repost this match?</p>
    </Modal>
  );
});

export default MatchRepostDialog;
