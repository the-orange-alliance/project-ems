import { Input, InputNumber, Select, Switch, Typography } from 'antd';
import { FC, ReactNode, useEffect, useState } from 'react';

export interface SchemaFormProps {
  /** A JSON Schema object (as published by `StatCatalogueEntry.paramsSchema`, i.e. `z.toJSONSchema(...)`). */
  schema: unknown;
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}

/**
 * The narrow slice of JSON Schema this generator understands. The 232 stat
 * `paramsSchema`s are all produced by `z.toJSONSchema(paramsFor(id))` (see
 * `libs/models/src/seasons/stats/registry.ts` / `parameter-schemas.ts`), so
 * the actual vocabulary in play is small: a flat `object` with `number` /
 * `integer` / `string` (optionally `enum`) / `boolean` / `array<number>`
 * properties. Nested objects, `oneOf`/`anyOf`, `$ref`, etc. never appear in
 * this catalogue and are intentionally not supported.
 */
interface JsonSchemaProperty {
  type?: string | string[];
  enum?: unknown[];
  default?: unknown;
  description?: string;
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  minItems?: number;
  maxItems?: number;
  items?: JsonSchemaProperty;
}

interface ObjectJsonSchema {
  type?: string | string[];
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
}

const asObjectSchema = (schema: unknown): ObjectJsonSchema | null => {
  if (typeof schema !== 'object' || schema === null) return null;
  return schema as ObjectJsonSchema;
};

/** `opponentTeamKey` -> `Opponent Team Key`. */
const humanize = (key: string): string => {
  const spaced = key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/^./, (c) => c.toUpperCase());
  return spaced;
};

const singleType = (type: string | string[] | undefined): string | undefined =>
  Array.isArray(type) ? type.find((t) => t !== 'null') : type;

interface FieldShellProps {
  label: string;
  description?: string;
  required?: boolean;
  error?: string | null;
}

const FieldShell: FC<FieldShellProps & { children: ReactNode }> = ({
  label,
  description,
  required,
  error,
  children
}) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
    <Typography.Text strong style={{ fontSize: 12 }}>
      {label}
      {required && <span style={{ color: 'var(--ant-color-error)' }}> *</span>}
    </Typography.Text>
    {children}
    {description && (
      <Typography.Text type='secondary' style={{ fontSize: 11 }}>
        {description}
      </Typography.Text>
    )}
    {error && (
      <Typography.Text type='danger' style={{ fontSize: 11 }}>
        {error}
      </Typography.Text>
    )}
  </div>
);

interface NumberFieldProps {
  fieldKey: string;
  schema: JsonSchemaProperty;
  required: boolean;
  value: unknown;
  onChange: (next: unknown) => void;
}

const NumberField: FC<NumberFieldProps> = ({
  fieldKey,
  schema,
  required,
  value,
  onChange
}) => {
  const isInteger = singleType(schema.type) === 'integer';
  // `.positive()` / `.max()` on the zod side often surfaces here as
  // `exclusiveMinimum`/`exclusiveMaximum` rather than `minimum`/`maximum`
  // (see e.g. `windowSeconds`/`lambda`/`balls` in `commonParamsSchema`).
  // `InputNumber` only understands inclusive bounds, so an exclusive bound
  // is nudged in by one step - the boundary value itself is then rejected,
  // which is what keeps a strictly-positive param from ever being
  // authored as 0 (and rejected by the API).
  const step = isInteger ? 1 : 0.01;
  const min =
    schema.minimum ??
    (schema.exclusiveMinimum !== undefined
      ? schema.exclusiveMinimum + step
      : undefined);
  const max =
    schema.maximum ??
    (schema.exclusiveMaximum !== undefined
      ? schema.exclusiveMaximum - step
      : undefined);
  const current =
    typeof value === 'number'
      ? value
      : typeof schema.default === 'number'
        ? schema.default
        : undefined;

  return (
    <FieldShell
      label={humanize(fieldKey)}
      description={schema.description}
      required={required}
    >
      <InputNumber
        style={{ width: '100%' }}
        value={current}
        min={min}
        max={max}
        precision={isInteger ? 0 : undefined}
        step={isInteger ? 1 : undefined}
        onChange={(next) =>
          onChange(typeof next === 'number' ? next : undefined)
        }
      />
    </FieldShell>
  );
};

interface StringFieldProps {
  fieldKey: string;
  schema: JsonSchemaProperty;
  required: boolean;
  value: unknown;
  onChange: (next: unknown) => void;
}

const StringField: FC<StringFieldProps> = ({
  fieldKey,
  schema,
  required,
  value,
  onChange
}) => {
  const current =
    typeof value === 'string'
      ? value
      : typeof schema.default === 'string'
        ? schema.default
        : undefined;

  return (
    <FieldShell
      label={humanize(fieldKey)}
      description={schema.description}
      required={required}
    >
      {schema.enum ? (
        <Select
          style={{ width: '100%' }}
          value={current}
          allowClear={!required}
          options={schema.enum.map((v) => ({
            label: String(v),
            value: String(v)
          }))}
          onChange={(next) => onChange(next ?? undefined)}
        />
      ) : (
        <Input
          value={current ?? ''}
          onChange={(e) => onChange(e.target.value || undefined)}
        />
      )}
    </FieldShell>
  );
};

interface BooleanFieldProps {
  fieldKey: string;
  schema: JsonSchemaProperty;
  required: boolean;
  value: unknown;
  onChange: (next: unknown) => void;
}

const BooleanField: FC<BooleanFieldProps> = ({
  fieldKey,
  schema,
  required,
  value,
  onChange
}) => {
  const current =
    typeof value === 'boolean'
      ? value
      : typeof schema.default === 'boolean'
        ? schema.default
        : false;

  return (
    <FieldShell
      label={humanize(fieldKey)}
      description={schema.description}
      required={required}
    >
      <Switch checked={current} onChange={(next) => onChange(next)} />
    </FieldShell>
  );
};

interface NumberArrayFieldProps {
  fieldKey: string;
  schema: JsonSchemaProperty;
  required: boolean;
  value: unknown;
  onChange: (next: unknown) => void;
}

/**
 * Comma-separated numeric editor for `array<number>` params. The only such
 * param in this catalogue is histogram `bins` (see `commonParamsSchema` in
 * `libs/models/src/seasons/stats/types.ts`), which the calculator requires
 * to be STRICTLY INCREASING - a constraint `bins`' zod `.refine(...)` checks
 * server-side but that a plain JSON Schema `type: 'array'` can't express, so
 * it is re-checked here and surfaced as an inline error instead of ever
 * being sent to the API.
 */
const NumberArrayField: FC<NumberArrayFieldProps> = ({
  fieldKey,
  schema,
  required,
  value,
  onChange
}) => {
  const initial = Array.isArray(value)
    ? (value as unknown[])
    : Array.isArray(schema.default)
      ? (schema.default as unknown[])
      : undefined;

  const [text, setText] = useState(() => (initial ?? []).join(', '));
  const [error, setError] = useState<string | null>(null);

  // Re-sync local text only when the field identity itself changes underfoot
  // (e.g. the whole `GraphicSpec` was swapped out from above) rather than on
  // every keystroke's round-trip through the parent - the parent is only
  // ever told about a value once it has already validated here.
  useEffect(() => {
    setText((initial ?? []).join(', '));
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldKey]);

  const handleTextChange = (raw: string) => {
    setText(raw);
    const trimmed = raw.trim();
    if (!trimmed) {
      setError(required ? 'Required' : null);
      onChange(undefined);
      return;
    }
    const parts = trimmed.split(',').map((s) => s.trim());
    const nums = parts.map((p) => Number(p));
    if (parts.some((p) => p === '') || nums.some((n) => Number.isNaN(n))) {
      setError('Enter comma-separated numbers');
      return;
    }
    if (schema.minItems !== undefined && nums.length < schema.minItems) {
      setError(`Enter at least ${schema.minItems} values`);
      return;
    }
    if (schema.maxItems !== undefined && nums.length > schema.maxItems) {
      setError(`Enter at most ${schema.maxItems} values`);
      return;
    }
    const strictlyIncreasing = nums.every((n, i) => i === 0 || n > nums[i - 1]);
    if (!strictlyIncreasing) {
      setError('Values must be strictly increasing');
      return;
    }
    setError(null);
    onChange(nums);
  };

  return (
    <FieldShell
      label={humanize(fieldKey)}
      description={schema.description}
      required={required}
      error={error}
    >
      <Input
        placeholder='e.g. 0, 100, 200, 300'
        value={text}
        onChange={(e) => handleTextChange(e.target.value)}
      />
    </FieldShell>
  );
};

/**
 * Renders a form for one JSON Schema object, generically. This is what
 * makes the 232 wildly-different `paramsSchema`s tractable: the catalogue
 * publishes each stat's parameters as JSON Schema, so one generator (rather
 * than 232 hand-written forms) drives every stat's parameter editor. Most
 * stats have no parameters at all (`paramsFor` returns `z.object({}).strict()`
 * for them) - that case renders the "No parameters" note below.
 */
export const SchemaForm: FC<SchemaFormProps> = ({
  schema,
  value,
  onChange
}) => {
  const objectSchema = asObjectSchema(schema);
  const properties = objectSchema?.properties ?? {};
  const required = new Set(objectSchema?.required ?? []);
  const entries = Object.entries(properties);

  if (entries.length === 0) {
    return (
      <Typography.Text type='secondary' style={{ fontSize: 12 }}>
        No parameters
      </Typography.Text>
    );
  }

  const setField = (key: string, next: unknown) => {
    if (next === undefined) {
      const { [key]: _omit, ...rest } = value;
      onChange(rest);
      return;
    }
    onChange({ ...value, [key]: next });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {entries.map(([key, propSchema]) => {
        const type = singleType(propSchema.type);
        const isRequired = required.has(key);
        const fieldValue = value[key];
        const onFieldChange = (next: unknown) => setField(key, next);

        if (type === 'number' || type === 'integer') {
          return (
            <NumberField
              key={key}
              fieldKey={key}
              schema={propSchema}
              required={isRequired}
              value={fieldValue}
              onChange={onFieldChange}
            />
          );
        }
        if (type === 'boolean') {
          return (
            <BooleanField
              key={key}
              fieldKey={key}
              schema={propSchema}
              required={isRequired}
              value={fieldValue}
              onChange={onFieldChange}
            />
          );
        }
        if (type === 'array') {
          const itemType = singleType(propSchema.items?.type);
          if (itemType === 'number' || itemType === 'integer') {
            return (
              <NumberArrayField
                key={key}
                fieldKey={key}
                schema={propSchema}
                required={isRequired}
                value={fieldValue}
                onChange={onFieldChange}
              />
            );
          }
          // Not a construct this catalogue produces - skip rather than
          // guess at a control.
          return null;
        }
        if (type === 'string') {
          return (
            <StringField
              key={key}
              fieldKey={key}
              schema={propSchema}
              required={isRequired}
              value={fieldValue}
              onChange={onFieldChange}
            />
          );
        }
        return null;
      })}
    </div>
  );
};
