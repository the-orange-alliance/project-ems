import type { TemplateVariable, TemplateVariableKind } from '@toa-lib/models';
import {
  CloseOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  PlusOutlined
} from '@ant-design/icons';
import {
  Button,
  Input,
  Popconfirm,
  Popover,
  Select,
  Space,
  Tag,
  Tooltip,
  Typography
} from 'antd';
import { FC, useState } from 'react';

export interface VariableEditorProps {
  variables: TemplateVariable[];
  /** Names currently referenced by at least one graphic in this timeline. */
  boundNames: string[];
  onChange: (variables: TemplateVariable[]) => void;
}

/** Producers type these by hand, so the rule is enforced verbatim -- never
 * silently trimmed, lower-cased, or otherwise mangled -- and a rejection
 * always comes with a reason. */
const NAME_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

const KIND_META: Record<
  TemplateVariableKind,
  { label: string; color: string }
> = {
  team: { label: 'Team', color: 'blue' },
  match: { label: 'Match', color: 'purple' },
  alliance: { label: 'Alliance', color: 'gold' }
};

const KIND_OPTIONS: { value: TemplateVariableKind; label: string }[] = (
  Object.keys(KIND_META) as TemplateVariableKind[]
).map((kind) => ({ value: kind, label: KIND_META[kind].label }));

/**
 * Validates a candidate variable name against the allowed character set and
 * uniqueness within the timeline. `ignoreName` excludes a variable's own
 * current name from the uniqueness check when validating a rename.
 */
function validateVariableName(
  name: string,
  variables: TemplateVariable[],
  ignoreName?: string
): string | null {
  if (!NAME_PATTERN.test(name)) {
    return 'Use 1-64 letters, numbers, "_" or "-" only.';
  }
  if (variables.some((v) => v.name === name && v.name !== ignoreName)) {
    return `"${name}" is already used by another variable.`;
  }
  return null;
}

interface VariableFormProps {
  initialName?: string;
  initialKind?: TemplateVariableKind;
  /** Excluded from the uniqueness check -- the variable's own name, when editing. */
  ignoreName?: string;
  variables: TemplateVariable[];
  submitLabel: string;
  onSubmit: (name: string, kind: TemplateVariableKind) => void;
  onCancel: () => void;
}

/** Shared name+kind form used by both "Add variable" and rename popovers. */
const VariableForm: FC<VariableFormProps> = ({
  initialName = '',
  initialKind = 'team',
  ignoreName,
  variables,
  submitLabel,
  onSubmit,
  onCancel
}) => {
  const [name, setName] = useState(initialName);
  const [kind, setKind] = useState<TemplateVariableKind>(initialKind);
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const validationError = validateVariableName(name, variables, ignoreName);
    if (validationError) {
      setError(validationError);
      return;
    }
    onSubmit(name, kind);
  };

  return (
    <Space direction='vertical' style={{ width: 240 }}>
      <Input
        autoFocus
        placeholder='e.g. redTeam'
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          setError(null);
        }}
        onPressEnter={submit}
        status={error ? 'error' : undefined}
      />
      <Select
        style={{ width: '100%' }}
        value={kind}
        options={KIND_OPTIONS}
        onChange={(value) => setKind(value)}
      />
      {error && <Typography.Text type='danger'>{error}</Typography.Text>}
      <Space>
        <Button type='primary' size='small' onClick={submit}>
          {submitLabel}
        </Button>
        <Button size='small' onClick={onCancel}>
          Cancel
        </Button>
      </Space>
    </Space>
  );
};

/**
 * Compact header-row editor for a timeline's template variables. Fully
 * controlled: every change is emitted through `onChange` as a brand new
 * array, and nothing is persisted or fetched here.
 */
export const VariableEditor: FC<VariableEditorProps> = ({
  variables,
  boundNames,
  onChange
}) => {
  const [addOpen, setAddOpen] = useState(false);
  const [editingName, setEditingName] = useState<string | null>(null);

  const handleAdd = (name: string, kind: TemplateVariableKind) => {
    const next: TemplateVariable[] = [...variables, { name, kind }];
    onChange(next);
    setAddOpen(false);
  };

  const handleRename = (
    oldName: string,
    newName: string,
    kind: TemplateVariableKind
  ) => {
    const next = variables.map((v) =>
      v.name === oldName ? { ...v, name: newName, kind } : v
    );
    onChange(next);
    setEditingName(null);
  };

  const handleRemove = (name: string) => {
    const next = variables.filter((v) => v.name !== name);
    onChange(next);
  };

  if (variables.length === 0) {
    return (
      <Space size='small' align='center'>
        <Typography.Text type='secondary'>
          No template variables yet -- declare one (a team, a match, an
          alliance) so graphics can bind to it.
        </Typography.Text>
        <Popover
          trigger='click'
          open={addOpen}
          onOpenChange={setAddOpen}
          content={
            <VariableForm
              variables={variables}
              submitLabel='Add'
              onSubmit={handleAdd}
              onCancel={() => setAddOpen(false)}
            />
          }
        >
          <Button size='small' icon={<PlusOutlined />}>
            Add variable
          </Button>
        </Popover>
      </Space>
    );
  }

  return (
    <Space size={[8, 8]} wrap align='center'>
      {variables.map((variable) => {
        const meta = KIND_META[variable.kind];
        const inUse = boundNames.includes(variable.name);
        const isEditing = editingName === variable.name;

        // Rename is disabled outright for an in-use variable (choice (a) --
        // see the report): this editor has no way to rewrite the graphics
        // that reference the old name, so allowing the rename would silently
        // orphan those bindings. Deleting is still allowed, but only behind
        // an explicit warning via the Popconfirm below.
        const editButton = (
          <Popover
            trigger='click'
            open={isEditing}
            onOpenChange={(open) => setEditingName(open ? variable.name : null)}
            content={
              <VariableForm
                initialName={variable.name}
                initialKind={variable.kind}
                ignoreName={variable.name}
                variables={variables}
                submitLabel='Rename'
                onSubmit={(name, kind) =>
                  handleRename(variable.name, name, kind)
                }
                onCancel={() => setEditingName(null)}
              />
            }
          >
            <Button
              type='text'
              size='small'
              icon={<EditOutlined />}
              disabled={inUse}
            />
          </Popover>
        );

        return (
          <Tag
            key={variable.name}
            style={{ marginInlineEnd: 0, paddingInlineEnd: 4 }}
          >
            <Space size={4}>
              <Tag color={meta.color} style={{ marginInlineEnd: 0 }}>
                {meta.label}
              </Tag>
              <Typography.Text>{variable.name}</Typography.Text>
              {inUse && (
                <Tooltip title='Bound to at least one graphic in this timeline; rename is disabled because this editor cannot rewrite those bindings. Remove the bindings first, or delete the variable to clear them.'>
                  <ExclamationCircleOutlined style={{ color: '#faad14' }} />
                </Tooltip>
              )}
              {inUse ? (
                <Tooltip title='Rename disabled: variable is bound to a graphic in this timeline.'>
                  <span>{editButton}</span>
                </Tooltip>
              ) : (
                editButton
              )}
              {inUse ? (
                <Popconfirm
                  title='Remove variable'
                  description={`"${variable.name}" is bound to at least one graphic in this timeline. Removing it will leave those bindings pointing at nothing until re-bound.`}
                  okText='Remove anyway'
                  okButtonProps={{ danger: true }}
                  cancelText='Cancel'
                  onConfirm={() => handleRemove(variable.name)}
                >
                  <Button
                    type='text'
                    size='small'
                    danger
                    icon={<CloseOutlined />}
                  />
                </Popconfirm>
              ) : (
                <Button
                  type='text'
                  size='small'
                  icon={<CloseOutlined />}
                  onClick={() => handleRemove(variable.name)}
                />
              )}
            </Space>
          </Tag>
        );
      })}
      <Popover
        trigger='click'
        open={addOpen}
        onOpenChange={setAddOpen}
        content={
          <VariableForm
            variables={variables}
            submitLabel='Add'
            onSubmit={handleAdd}
            onCancel={() => setAddOpen(false)}
          />
        }
      >
        <Button size='small' icon={<PlusOutlined />}>
          Add variable
        </Button>
      </Popover>
    </Space>
  );
};
