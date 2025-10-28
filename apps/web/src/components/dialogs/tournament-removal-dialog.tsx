import { Modal, Button } from 'antd';
import { create, useModal } from '@ebay/nice-modal-react';
import { Tournament } from '@toa-lib/models';

interface Props {
  tournament: Tournament;
}

export const TournamentRemovalDialog = create(({ tournament }: Props) => {
  const modal = useModal();
  const handleClose = () => {
    modal.resolve(false);
    modal.hide();
  };
  const handleResolve = () => {
    modal.resolve(true);
    modal.hide();
  };
  return (
    <Modal
      open={modal.visible}
      onCancel={handleClose}
      title='Tournament Removal'
      footer={[
        <Button key='yes' type='primary' danger onClick={handleResolve}>
          Yes
        </Button>,
        <Button key='no' onClick={handleClose}>
          No
        </Button>
      ]}
      destroyOnClose
    >
      <p>
        Are you sure you want to remove <b>{tournament.name}</b> from the event
        tournament list?
      </p>
    </Modal>
  );
});
