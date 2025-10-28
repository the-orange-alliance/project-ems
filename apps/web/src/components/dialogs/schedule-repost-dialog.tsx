import { Modal, Button } from 'antd';
import { create, useModal } from '@ebay/nice-modal-react';

const ScheduleRepostDialog = create(() => {
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
      title='Schedule Matches'
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
      <p>
        This tournament already has a schedule posted. Reposting the schedule
        will overwrite the existing schedule (including all matches,
        participants, and details).
      </p>
      <p>Are you sure you want to repost the schedule?</p>
    </Modal>
  );
});

export default ScheduleRepostDialog;
