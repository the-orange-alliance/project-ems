import { Modal, Button } from 'antd';
import { create, useModal } from '@ebay/nice-modal-react';

interface CarriedCardDialogProps {
  /** Display names of the teams receiving a yellow while already carrying one. */
  teams: string[];
}

/**
 * Shown at commit time when a team that is already carrying a yellow card
 * receives another one in the match being committed.
 *
 * This is purely advisory. EMS does not escalate a second yellow to a red —
 * that call belongs to a human, which is the entire point of the prompt.
 * Cancelling aborts the commit so the scores can be corrected first.
 */
export const CarriedCardDialog = create<CarriedCardDialogProps>(({ teams }) => {
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
      title='Repeat Yellow Card'
      footer={[
        <Button key='continue' type='primary' danger onClick={handleContinue}>
          Commit Anyway
        </Button>,
        <Button key='cancel' onClick={handleClose}>
          Cancel
        </Button>
      ]}
      destroyOnClose
    >
      <p>
        {teams.length === 1
          ? `${teams[0]} received a yellow card this match and was already carrying one.`
          : `The following teams received a yellow card this match and were already carrying one: ${teams.join(
              ', '
            )}.`}
      </p>
      <p>
        <strong>Consult with HR</strong> before committing these scores.
      </p>
    </Modal>
  );
});
