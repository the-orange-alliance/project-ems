import type { TemplateVariable, VariableValues } from '@toa-lib/models';
import { InputNumber, Modal, Space, Typography } from 'antd';
import { FC, useEffect, useRef, useState } from 'react';
import { useTeamsForEvent } from '../../api/use-team-data.js';
import { AutocompleteTeam } from '../../components/dropdowns/autocomplete-team.js';
import { MatchSelect } from './match-select.js';

export interface VariableFillModalProps {
  open: boolean;
  eventKey: string;
  /** The timeline's declared variables, in order. */
  variables: TemplateVariable[];
  /** Pre-existing values when editing an already-queued entry; {} when filling fresh. */
  initialValues?: VariableValues;
  /** Confirm-button text, e.g. 'Add to queue' or 'Cue'. */
  confirmText?: string;
  onCancel: () => void;
  onSubmit: (values: VariableValues) => void;
}

/** A value is only usable once it is a positive integer -- 0, NaN, and
 * negative/fractional inputs all mean "not actually chosen yet". Treating
 * those as unset (rather than emitting them) is what keeps an unresolved
 * variable from resolving to subject 0 downstream. */
function isValidValue(value: number | undefined): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

/**
 * Modal that collects a concrete value for each of a timeline's declared
 * template variables (a team, a match, or an alliance seed) before the
 * timeline can be queried or queued. Fully controlled -- the caller owns
 * `open`/`initialValues` and receives the finished map through `onSubmit`.
 */
export const VariableFillModal: FC<VariableFillModalProps> = ({
  open,
  eventKey,
  variables,
  initialValues,
  confirmText = 'Confirm',
  onCancel,
  onSubmit
}) => {
  const [values, setValues] = useState<Partial<Record<string, number>>>(
    initialValues ?? {}
  );
  const { data: teams } = useTeamsForEvent(eventKey);

  // `initialValues` is a plain object prop -- callers typically pass
  // something like `initialValues={entry?.values ?? {}}`, which is a brand
  // new reference on every render. Depending on it directly would re-seed
  // (and wipe out in-progress edits) on every unrelated parent re-render
  // while the modal stays open. Instead we track the latest value in a ref
  // (updated on every render, no effect needed) and only reseed on the
  // false -> true transition of `open`, which we detect with a second ref.
  const initialValuesRef = useRef(initialValues);
  initialValuesRef.current = initialValues;
  const wasOpenRef = useRef(open);

  // Re-seed from the latest `initialValues` only when the modal transitions
  // from closed to open, so reopening for a different queue entry never
  // shows the previous entry's values (e.g. editing entry 3 must not
  // inherit entry 2's team), while staying open never resets in-progress
  // edits just because the parent re-rendered with a new object identity.
  useEffect(() => {
    if (open && !wasOpenRef.current) {
      setValues(initialValuesRef.current ?? {});
    }
    wasOpenRef.current = open;
  }, [open]);

  // requirement 7: an empty variable list means there is nothing to fill in,
  // so this modal is a no-op pass-through. The ref guards against firing
  // onSubmit repeatedly across re-renders while `open` stays true.
  const emptySubmittedRef = useRef(false);
  useEffect(() => {
    if (open && variables.length === 0) {
      if (!emptySubmittedRef.current) {
        emptySubmittedRef.current = true;
        onSubmit({});
      }
    } else if (!open) {
      emptySubmittedRef.current = false;
    }
  }, [open, variables.length, onSubmit]);

  if (variables.length === 0) {
    return null;
  }

  const setValue = (name: string, value: number | undefined) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const unfilledCount = variables.filter(
    (variable) => !isValidValue(values[variable.name])
  ).length;
  const allFilled = unfilledCount === 0;

  const handleOk = () => {
    // Only positive integers make it into the submitted object -- unfilled
    // variables are omitted entirely, never emitted as 0/null/NaN.
    const result: VariableValues = {};
    for (const variable of variables) {
      const value = values[variable.name];
      if (isValidValue(value)) {
        result[variable.name] = value;
      }
    }
    onSubmit(result);
  };

  const handleCancel = () => {
    setValues(initialValues ?? {});
    onCancel();
  };

  return (
    <Modal
      title='Fill in variables'
      open={open}
      onOk={handleOk}
      onCancel={handleCancel}
      okText={confirmText}
      okButtonProps={{ disabled: !allFilled }}
      destroyOnHidden
    >
      <Space direction='vertical' style={{ width: '100%' }} size='middle'>
        {!allFilled && (
          <Typography.Text type='secondary'>
            {unfilledCount} of {variables.length} variable
            {variables.length === 1 ? '' : 's'} still need
            {unfilledCount === 1 ? 's' : ''} a value.
          </Typography.Text>
        )}
        {variables.map((variable) => {
          const label = variable.label ?? variable.name;
          const value = values[variable.name];
          return (
            <div key={variable.name}>
              <Typography.Text strong>{label}</Typography.Text>
              <div style={{ marginTop: 4 }}>
                {variable.kind === 'team' && (
                  <AutocompleteTeam
                    teamKey={value ?? null}
                    teams={teams}
                    onChange={(team) =>
                      setValue(variable.name, team?.teamKey ?? undefined)
                    }
                  />
                )}
                {variable.kind === 'match' && (
                  <MatchSelect
                    eventKey={eventKey}
                    value={value}
                    onChange={(matchId) => setValue(variable.name, matchId)}
                  />
                )}
                {variable.kind === 'alliance' && (
                  <InputNumber
                    style={{ width: '100%' }}
                    min={1}
                    precision={0}
                    value={value}
                    onChange={(next) =>
                      setValue(
                        variable.name,
                        typeof next === 'number' ? next : undefined
                      )
                    }
                  />
                )}
              </div>
            </div>
          );
        })}
      </Space>
    </Modal>
  );
};
