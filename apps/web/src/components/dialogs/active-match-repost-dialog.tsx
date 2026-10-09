import { Modal, Button } from 'antd';
import { create, useModal } from '@ebay/nice-modal-react';

interface ActiveMatchRepostDialogProps {
  /** Name of the match currently prestarted or running, if known. */
  matchName?: string;
}

/**
 * Follow-on to the repost confirmation, shown when a match is active (prestarted
 * through uncommitted results). Posting another match ends the active match's
 * cycle, so confirming clears it and the scorekeeper must prestart it again.
 */
const ActiveMatchRepostDialog = create<ActiveMatchRepostDialogProps>(
  ({ matchName }) => {
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
        title='Match Active'
        footer={[
          <Button key='continue' type='primary' danger onClick={handleContinue}>
            Clear Active Match & Post
          </Button>,
          <Button key='cancel' onClick={handleClose}>
            Cancel
          </Button>
        ]}
        destroyOnClose
      >
        <p>
          {matchName ? <strong>{matchName}</strong> : 'A match'} is currently
          active.
        </p>
        <p>
          Updating and posting will clear the active match. The scorekeeper
          will need to prestart it again.
        </p>
      </Modal>
    );
  }
);

export default ActiveMatchRepostDialog;
