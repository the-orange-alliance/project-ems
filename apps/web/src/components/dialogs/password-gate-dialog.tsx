import { create, useModal } from '@ebay/nice-modal-react';
import { Input, Modal, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { elevatedAuthApi } from 'src/api/use-elevated-auth.js';

/**
 * Password-gate modal for destructive (elevated) actions.
 *
 * - Prompts on every call (no session elevation / no stored token).
 * - OK → verifies against POST /auth/elevated; resolves true on success,
 *   shows inline error and stays open on failure.
 * - Cancel / backdrop close → resolves false.
 * - Enter key submits the form.
 */
export const PasswordGateDialog = create(() => {
  const modal = useModal();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Reset state every time the modal opens
  useEffect(() => {
    if (modal.visible) {
      setPassword('');
      setError('');
      setLoading(false);
    }
  }, [modal.visible]);

  const handleOk = async () => {
    setLoading(true);
    setError('');
    try {
      const ok = await elevatedAuthApi.create.verify(password);
      if (ok) {
        modal.resolve(true);
        modal.hide();
      } else {
        setError('Incorrect password.');
        setLoading(false);
      }
    } catch {
      setError('Unable to verify password. Please try again.');
      setLoading(false);
    }
  };

  const handleCancel = () => {
    modal.resolve(false);
    modal.hide();
  };

  return (
    <Modal
      open={modal.visible}
      title='Authorization required'
      okText='Confirm'
      onOk={handleOk}
      onCancel={handleCancel}
      confirmLoading={loading}
      afterClose={() => modal.remove()}
      destroyOnClose
    >
      <Input.Password
        autoFocus
        placeholder='Enter password'
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onPressEnter={handleOk}
        disabled={loading}
        style={{ marginBottom: error ? 8 : 0 }}
      />
      {error && <Typography.Text type='danger'>{error}</Typography.Text>}
    </Modal>
  );
});
