import { Modal, Button, Dropdown, Space } from 'antd';
import { create, useModal } from '@ebay/nice-modal-react';
import {
  toMenuItems,
  useFieldControlOptionsItems,
  useProductionOptionsItems
} from 'src/apps/scorekeeper/hooks/use-production-options.js';

/**
 * Blocking confirmation shown after "Set Displays" on a paired field whose
 * partner field's previous match hasn't posted yet (issue #262). Resolves
 * `true` for "Set Field as Active", `false` for "Back Out". Deliberately
 * non-dismissable — no Esc, no mask click, no close icon — the operator must
 * pick one of the two footer actions.
 */
export const PairedFieldDialog = create(() => {
  const modal = useModal();
  const productionItems = useProductionOptionsItems();
  const fieldControlItems = useFieldControlOptionsItems();

  const handleBackOut = () => {
    modal.resolve(false);
    modal.hide();
  };

  const handleSetActive = () => {
    modal.resolve(true);
    modal.hide();
  };

  return (
    <Modal
      open={modal.visible}
      closable={false}
      maskClosable={false}
      keyboard={false}
      title='Match Preview Set'
      footer={[
        <Button key='back' onClick={handleBackOut}>
          Back Out
        </Button>,
        <Button key='active' type='primary' danger onClick={handleSetActive}>
          Set Field as Active
        </Button>
      ]}
    >
      <Space direction='vertical' size='middle' style={{ width: '100%' }}>
        <p>
          Match preview is set. Please wait for all paired fields to finish
          before continuing.
        </p>
        <Dropdown
          menu={{ items: toMenuItems([...productionItems, ...fieldControlItems]) }}
          trigger={['click']}
        >
          <Button>Field Prep Options</Button>
        </Dropdown>
      </Space>
    </Modal>
  );
});
