import { WebhookEvent } from '@toa-lib/models';
import { useAtomValue } from 'jotai';
import type { MenuProps } from 'antd';
import { emitWebhook } from 'src/api/use-webhook-data.js';
import { useSeasonFieldControl } from 'src/hooks/use-season-components.js';
import { useSocketWorker } from 'src/api/use-socket-worker.js';
import { matchAtom } from 'src/stores/state/event.js';
import { pairedFieldAtom } from 'src/stores/state/ui.js';

export interface ActionItem {
  key: string;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}

/** Renders a shared `ActionItem[]` as antd `Dropdown`/`Menu` items. */
export const toMenuItems = (items: ActionItem[]): NonNullable<MenuProps['items']> =>
  items.map(({ key, label, disabled, onClick }) => ({
    key,
    label,
    disabled,
    onClick
  }));

/**
 * The 3 production/broadcast webhook actions from issue #262, shared by the
 * app bar "Production Options" dropdown and the paired-field blocking
 * dialog's "Field Prep Options" dropdown.
 *
 * "Force Field Active" is disabled unless a paired field is selected in
 * settings — this is the manual/on-demand override and does not run the
 * previous-match gate; it just fires the webhook immediately.
 */
export const useProductionOptionsItems = (): ActionItem[] => {
  const match = useAtomValue(matchAtom);
  const pairedField = useAtomValue(pairedFieldAtom);
  return [
    {
      key: 'production_active',
      label: 'Force Field Active',
      disabled: !pairedField || !match,
      onClick: () => emitWebhook(WebhookEvent.PRODUCTION_ACTIVE, match)
    },
    {
      key: 'force_lights_match',
      label: 'Force Match Lighting',
      disabled: !match,
      onClick: () => emitWebhook(WebhookEvent.FORCE_LIGHTS_MATCH, match)
    },
    {
      key: 'force_lights_standby',
      label: 'Force Standby Lighting',
      disabled: !match,
      onClick: () => emitWebhook(WebhookEvent.FORCE_LIGHTS_STANDBY, match)
    }
  ];
};

/**
 * The 4 existing "Options" tab actions (see scorekeeper-options.tsx), pulled
 * out into a shared hook so the tab and the paired-field dialog's combined
 * "Field Prep Options" dropdown don't duplicate the field-control calls.
 */
export const useFieldControlOptionsItems = (): ActionItem[] => {
  const fieldControl = useSeasonFieldControl();
  const { worker } = useSocketWorker();
  return [
    {
      key: 'force_field_green',
      label: 'Force Field Green',
      onClick: () => fieldControl?.clearField?.()
    },
    {
      key: 'force_prep_field',
      label: 'Force Prep Field',
      onClick: () => fieldControl?.prepareField?.()
    },
    {
      key: 'awards_mode',
      label: 'Awards Mode',
      onClick: () => fieldControl?.awardsMode?.()
    },
    {
      key: 'force_rope_drop',
      label: 'Force Rope Drop (2025)',
      onClick: () => worker?.emit('fcs:ropeDrop')
    }
  ];
};
