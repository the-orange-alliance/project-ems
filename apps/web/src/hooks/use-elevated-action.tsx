import { useModal } from '@ebay/nice-modal-react';
import { PasswordGateDialog } from 'src/components/dialogs/password-gate-dialog.js';

/**
 * Returns a `requireElevation()` function that shows the password-gate modal
 * and resolves to `true` if the correct password was entered, or `false` if
 * the user cancelled or entered a wrong password.
 *
 * Usage:
 *   const { requireElevation } = useElevatedAction();
 *   const handleDestructive = async () => {
 *     if (!(await requireElevation())) return;
 *     // ... perform the destructive action
 *   };
 */
export const useElevatedAction = () => {
  const modal = useModal(PasswordGateDialog);
  return { requireElevation: () => modal.show() as Promise<boolean> };
};
