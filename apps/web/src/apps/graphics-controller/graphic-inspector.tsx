import type {
  GraphicKind,
  GraphicSpec,
  PresentationMode,
  TemplateVariable
} from '@toa-lib/models';
import {
  KIND_FOR_SELECTOR,
  SUPPORTED_GRAPHIC_MODES,
  TournamentTypes,
  type TournamentType
} from '@toa-lib/models';
import { presentationFor } from '@toa-lib/models/seasons/stats/presentation';
import {
  Divider,
  Input,
  InputNumber,
  Segmented,
  Select,
  Switch,
  Typography
} from 'antd';
import { useAtomValue } from 'jotai';
import { Children, FC, ReactNode, useEffect } from 'react';
import { useTeamsForEvent } from '../../api/use-team-data.js';
import type { StatCatalogueEntry } from '../../api/use-stats-data.js';
import { eventKeyAtom } from 'src/stores/state/index.js';
import { MatchSelect } from './match-select.js';
import { SchemaForm } from './schema-form.js';

export interface GraphicInspectorProps {
  spec: GraphicSpec;
  catalogueEntry: StatCatalogueEntry;
  /** Template variables declared on the enclosing timeline; a selector may
   * bind to one of these instead of carrying a fixed value (see
   * `patchBinding` and the corrective effect below). Defaults to none. */
  variables?: TemplateVariable[];
  onChange: (spec: GraphicSpec) => void;
}

const KIND_LABEL: Record<GraphicKind, string> = {
  'stat-tile': 'Stat Tile',
  bar: 'Bar',
  'grouped-bar': 'Grouped Bar',
  line: 'Line',
  histogram: 'Histogram',
  'ranking-table': 'Ranking',
  heatmap: 'Heatmap',
  'geo-map': 'Geo Map',
  table: 'Table'
};

const MODE_OPTIONS: { value: PresentationMode; label: string }[] = [
  { value: 'fullscreen', label: 'Fullscreen' },
  { value: 'drawer-left', label: 'Tombstone Left' },
  { value: 'drawer-right', label: 'Tombstone Right' },
  { value: 'lower-third', label: 'Lower Third' }
];

const SORT_DIR_OPTIONS = [
  { value: 'asc', label: 'Ascending' },
  { value: 'desc', label: 'Descending' }
];

const SELECTOR_KEYS = [
  'teamKey',
  'matchId',
  'allianceSeed',
  'teamsInMatchId',
  'teamKeyList'
] as const;
type SelectorKey = (typeof SELECTOR_KEYS)[number];

/** The subset of `SELECTOR_KEYS` that support the Value|Variable binding
 * toggle. `teamKeyList` doesn't: no single-value template variable can
 * represent an arbitrary, producer-picked list of teams, so it is Value-only
 * (a plain multiselect, no toggle at all - see its field below). */
const BINDABLE_SELECTOR_KEYS = [
  'teamKey',
  'matchId',
  'allianceSeed',
  'teamsInMatchId'
] as const;
type BindableSelectorKey = (typeof BINDABLE_SELECTOR_KEYS)[number];

/** Human-readable name for the variable kind that fills each bindable
 * selector key, used only in the Variable-toggle's disabled tooltip. */
const SELECTOR_VARIABLE_KIND_LABEL: Record<BindableSelectorKey, string> = {
  teamKey: 'team',
  matchId: 'match',
  allianceSeed: 'alliance',
  teamsInMatchId: 'match'
};

const Field: FC<{ label: string; children: ReactNode }> = ({
  label,
  children
}) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
    <Typography.Text strong style={{ fontSize: 12 }}>
      {label}
    </Typography.Text>
    {children}
  </div>
);

/**
 * Lays its children out on a single line, each one an equal-flexing column
 * that drops to its own line once the row can no longer give it
 * `minChildWidth`. Keeps related controls (title/subtitle, kind/mode, the
 * display-option cluster) paired on wide panels while still collapsing to a
 * clean stack on narrow ones. `null`/`false` children are skipped so callers
 * can use inline conditionals.
 */
const Row: FC<{ children: ReactNode; minChildWidth?: number }> = ({
  children,
  minChildWidth = 200
}) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
    {Children.map(children, (child) =>
      child === null || child === undefined || child === false ? null : (
        <div style={{ flex: `1 1 ${minChildWidth}px`, minWidth: 0 }}>
          {child}
        </div>
      )
    )}
  </div>
);

/**
 * Copies `source[key]` onto `target[key]` for one `SelectorKey`, generic
 * over `K` so `value`'s type stays correlated to `key` - a plain
 * `target[key] = source[key]` inside a loop over the whole `SelectorKey`
 * union does not typecheck (TypeScript can't prove a value read back via a
 * union-typed key matches that same union-typed key on write), even though
 * it's sound at each individual key. Used by the corrective effect's
 * selectors-stripping loop below, now that `SelectorKey` spans both scalar
 * (`number`) and list (`teamKeyList: number[]`) selector value types.
 */
function copySelectorIfPresent<K extends SelectorKey>(
  source: GraphicSpec['selectors'],
  target: GraphicSpec['selectors'],
  key: K
): boolean {
  const value = source[key];
  if (value === undefined) return false;
  target[key] = value;
  return true;
}

/**
 * Fully-controlled panel for editing one `GraphicSpec`. No internal
 * persistence - every edit flows straight through `onChange` to whatever
 * dirty-buffer the caller owns (see `useTimelineEditor`'s `updateItem`).
 *
 * CORRECTNESS: the stats API rejects (HTTP 400) a query whose tournament
 * type falls outside the stat's `allowedTournamentTypes`, whose selector
 * isn't in `supportedSelectors`, or whose `params` carries a key the stat's
 * `.strict()` zod schema doesn't declare. Every control below is built so
 * the invalid choice is simply never offered, rather than caught after the
 * fact:
 *  - the kind `Select`'s `options` are `presentation.allowedKinds` only.
 *  - a selector control only renders at all when its key is present in
 *    `catalogueEntry.supportedSelectors`.
 *  - the tournament-type `Select`'s `options` are
 *    `catalogueEntry.allowedTournamentTypes` when the catalogue entry
 *    declares one (every `TournamentType` otherwise).
 *  - the params form is generated FROM `catalogueEntry.paramsSchema` itself
 *    (see `schema-form.tsx`), so it can only ever produce keys the schema
 *    actually declares.
 * A corrective effect below additionally re-derives `kind`/`selectors`/
 * `filters.tournamentTypes` whenever the catalogue entry identity changes
 * underneath an already-mounted panel (this component takes no `key` from
 * its caller to force a remount), so a previously-valid spec can never be
 * left holding a choice a new catalogue entry has made invalid.
 */
export const GraphicInspector: FC<GraphicInspectorProps> = ({
  spec,
  catalogueEntry,
  variables = [],
  onChange
}) => {
  const eventKey = useAtomValue(eventKeyAtom);
  const presentation = presentationFor(catalogueEntry.catalogueId);

  const needsTeams =
    catalogueEntry.supportedSelectors.includes('teamKey') ||
    catalogueEntry.supportedSelectors.includes('teamKeyList');
  const { data: teams = [] } = useTeamsForEvent(needsTeams ? eventKey : null);

  // Variables usable for a given BINDABLE selector key: only those whose
  // `kind` matches what that key accepts, via `KIND_FOR_SELECTOR` (e.g. only
  // `team` variables can fill `teamKey`; both `matchId` and
  // `teamsInMatchId` accept `match` variables). `teamKeyList` has no entry
  // here - it isn't bindable (see `BINDABLE_SELECTOR_KEYS`).
  const variablesForSelector = (key: BindableSelectorKey) =>
    variables.filter((variable) => KIND_FOR_SELECTOR[key] === variable.kind);

  // See the CORRECTNESS note above - re-validates kind/selectors/tournament
  // types against the current catalogue entry whenever it changes (id
  // included, so a stat swap under an already-mounted panel is caught too).
  useEffect(() => {
    let nextKind = spec.kind;
    if (!presentation.allowedKinds.includes(spec.kind)) {
      nextKind = presentation.defaultKind;
    }
    const allowedModes = SUPPORTED_GRAPHIC_MODES[nextKind];
    const nextMode = allowedModes.includes(spec.mode)
      ? spec.mode
      : allowedModes[0];

    const supported = new Set(catalogueEntry.supportedSelectors);
    let selectorsChanged = false;
    const nextSelectors: GraphicSpec['selectors'] = {};
    for (const key of SELECTOR_KEYS) {
      if (spec.selectors[key] === undefined) continue;
      if (supported.has(key))
        copySelectorIfPresent(spec.selectors, nextSelectors, key);
      else selectorsChanged = true;
    }

    // A binding must be dropped when either (a) its selector key is no
    // longer supported by this catalogue entry, or (b) the variable name it
    // names no longer exists on the timeline (renamed or deleted). Without
    // this, a stale binding leaves the graphic permanently unresolvable -
    // it never supplies the key and never queries - with nothing visible
    // to explain why.
    const variableNames = new Set(variables.map((variable) => variable.name));
    let bindingsChanged = false;
    const nextBindings: NonNullable<GraphicSpec['bindings']> = {};
    if (spec.bindings) {
      for (const key of BINDABLE_SELECTOR_KEYS) {
        const variableName = spec.bindings[key];
        if (variableName === undefined) continue;
        if (supported.has(key) && variableNames.has(variableName)) {
          nextBindings[key] = variableName;
        } else {
          bindingsChanged = true;
        }
      }
    }

    const allowed = catalogueEntry.allowedTournamentTypes;
    const currentTypes = spec.filters.tournamentTypes;
    let nextTournamentTypes = currentTypes;
    let filtersChanged = false;
    if (allowed && currentTypes) {
      const filtered = currentTypes.filter((t) => allowed.includes(t));
      if (filtered.length !== currentTypes.length) {
        nextTournamentTypes = filtered.length ? filtered : undefined;
        filtersChanged = true;
      }
    } else if (!currentTypes && catalogueEntry.defaultTournamentTypes?.length) {
      nextTournamentTypes = catalogueEntry.defaultTournamentTypes;
      filtersChanged = true;
    }

    if (
      nextKind !== spec.kind ||
      nextMode !== spec.mode ||
      selectorsChanged ||
      bindingsChanged ||
      filtersChanged
    ) {
      const specWithoutBindings = { ...spec };
      delete specWithoutBindings.bindings;
      const nextBindingsCount = Object.keys(nextBindings).length;
      onChange({
        ...(bindingsChanged && nextBindingsCount === 0
          ? specWithoutBindings
          : spec),
        kind: nextKind,
        mode: nextMode,
        selectors: selectorsChanged ? nextSelectors : spec.selectors,
        ...(bindingsChanged && nextBindingsCount > 0
          ? { bindings: nextBindings }
          : {}),
        filters: filtersChanged
          ? { ...spec.filters, tournamentTypes: nextTournamentTypes }
          : spec.filters
      });
    }
    // Only re-run when the catalogue entry this panel is bound to changes,
    // or when the timeline's variables change - a rename/removal of a bound
    // variable must be caught even while the catalogue entry stays put.
    // Not on every keystroke elsewhere in the spec.
  }, [catalogueEntry.catalogueId, variables]);

  const patch = (partial: Partial<GraphicSpec>) =>
    onChange({ ...spec, ...partial });

  const patchOptions = (partial: Partial<GraphicSpec['options']>) =>
    onChange({ ...spec, options: { ...spec.options, ...partial } });

  const patchSelector = (
    key: BindableSelectorKey,
    value: number | undefined
  ) => {
    const next = { ...spec.selectors };
    if (value === undefined) delete next[key];
    else next[key] = value;
    onChange({ ...spec, selectors: next });
  };

  // `teamKeyList` is Value-only (see `BINDABLE_SELECTOR_KEYS`), so it gets
  // its own patcher rather than reusing `patchSelector` (scalar) or
  // `patchBinding` (variable-only). An empty array is treated the same as
  // `undefined` - "no teams picked yet", never a literal empty-list query.
  const patchTeamKeyList = (value: number[] | undefined) => {
    const next = { ...spec.selectors };
    if (value === undefined || value.length === 0) delete next.teamKeyList;
    else next.teamKeyList = value;
    onChange({ ...spec, selectors: next });
  };

  // A selector key must never carry both a fixed value and a variable
  // binding at once. Binding a variable to `key` therefore clears any
  // literal `selectors[key]`; clearing the binding leaves the selector
  // unset (Value mode starts from "All ..." rather than reviving a stale
  // literal). When the last binding is removed, `bindings` itself is
  // dropped entirely rather than left behind as an empty `{}` - the spec's
  // schema is `.strict()` and an empty object there is pure noise.
  const patchBinding = (
    key: BindableSelectorKey,
    variableName: string | undefined
  ) => {
    const nextBindings = { ...spec.bindings };
    if (variableName === undefined) delete nextBindings[key];
    else nextBindings[key] = variableName;

    const nextSelectors = { ...spec.selectors };
    delete nextSelectors[key];

    if (Object.keys(nextBindings).length > 0) {
      onChange({ ...spec, bindings: nextBindings, selectors: nextSelectors });
    } else {
      const rest = { ...spec };
      delete rest.bindings;
      onChange({ ...rest, selectors: nextSelectors });
    }
  };

  // Sending an EXPLICIT but empty `tournamentTypes` filter is itself
  // rejected server-side ("An explicit tournament filter must not be
  // empty" - see `registry.ts`), so clearing every tag drops the key
  // entirely rather than leaving `[]` behind.
  const handleTournamentTypesChange = (values: string[]) => {
    const next = { ...spec.filters };
    if (values.length === 0) delete next.tournamentTypes;
    else next.tournamentTypes = values as TournamentType[];
    onChange({ ...spec, filters: next });
  };

  // Value | Variable toggle for one selector. Mode is derived (never
  // stored) from whether `spec.bindings[key]` is set. Picking "Variable"
  // binds the first matching variable immediately (there is no
  // intermediate "chosen but unset" state to store); the Select rendered
  // below the toggle then lets the producer pick a different one. When no
  // variable of the matching kind exists, the option is disabled and a
  // tooltip explains why rather than hiding it silently. `disabled` (used
  // by Team/Teams in Match - see their shared row below) disables the
  // WHOLE toggle, for the currently-inactive side of a mutually-exclusive
  // pair.
  const renderSelectorModeToggle = (
    key: BindableSelectorKey,
    disabled = false
  ) => {
    const matchingVariables = variablesForSelector(key);
    const mode = spec.bindings?.[key] !== undefined ? 'variable' : 'value';
    return (
      <Segmented
        size='small'
        value={mode}
        disabled={disabled}
        options={[
          { label: 'Value', value: 'value' },
          {
            label: 'Variable',
            value: 'variable',
            disabled: disabled || matchingVariables.length === 0,
            tooltip:
              matchingVariables.length === 0
                ? `No ${SELECTOR_VARIABLE_KIND_LABEL[key]} variables are declared on this timeline`
                : undefined
          }
        ]}
        onChange={(next) => {
          if (next === 'variable') {
            if (matchingVariables[0]) {
              patchBinding(key, matchingVariables[0].name);
            }
          } else {
            patchBinding(key, undefined);
          }
        }}
      />
    );
  };

  // `teamKey`, `teamsInMatchId`, and `teamKeyList` are three mutually
  // exclusive ways to supply a multi-team stat's subjects (see
  // `resolveTeamKeys`'s own doc comment in `types.ts`: `teamKey` wins
  // outright, then `teamsInMatchId`, then `teamKeyList`, only when both are
  // absent). Rather than hiding whichever isn't in use, the Team/Teams in
  // Match/Multiple Teams row (below) keeps all three visible side by side
  // and disables the inactive ones' controls - clearing the active one's
  // own Select (all three have `allowClear`) re-enables the others. Each
  // `*Active` flag defers to every higher-precedence one, so at most one is
  // ever true at once.
  const teamActive =
    spec.selectors.teamKey !== undefined ||
    spec.bindings?.teamKey !== undefined;
  const teamsInMatchActive =
    !teamActive &&
    (spec.selectors.teamsInMatchId !== undefined ||
      spec.bindings?.teamsInMatchId !== undefined);
  const teamKeyListActive =
    !teamActive &&
    !teamsInMatchActive &&
    (spec.selectors.teamKeyList?.length ?? 0) > 0;

  const tournamentTypeOptions = (
    catalogueEntry.allowedTournamentTypes ??
    TournamentTypes.map((t) => t.key as TournamentType)
  ).map((key) => ({ value: key, label: key }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Row>
        <Field label='Title'>
          <Input
            value={spec.title}
            onChange={(e) => patch({ title: e.target.value })}
          />
        </Field>

        <Field label='Subtitle'>
          <Input
            value={spec.subtitle ?? ''}
            onChange={(e) => patch({ subtitle: e.target.value || undefined })}
          />
        </Field>
      </Row>

      <Row>
        <Field label='Kind'>
          <Select
            style={{ width: '100%' }}
            value={spec.kind}
            options={presentation.allowedKinds.map((kind) => ({
              value: kind,
              label: KIND_LABEL[kind]
            }))}
            onChange={(kind: GraphicKind) => {
              const allowedModes = SUPPORTED_GRAPHIC_MODES[kind];
              patch({
                kind,
                mode: allowedModes.includes(spec.mode)
                  ? spec.mode
                  : allowedModes[0]
              });
            }}
          />
        </Field>

        <Field label='Mode'>
          <Select
            style={{ width: '100%' }}
            value={spec.mode}
            options={MODE_OPTIONS.filter(({ value }) =>
              SUPPORTED_GRAPHIC_MODES[spec.kind].includes(value)
            )}
            onChange={(mode: PresentationMode) => patch({ mode })}
          />
        </Field>
      </Row>

      {catalogueEntry.supportedSelectors.length > 0 && (
        <>
          <Divider style={{ margin: 0 }} />
          <Typography.Text type='secondary' style={{ fontSize: 12 }}>
            Selectors
          </Typography.Text>

          {/* `teamKey`, `teamsInMatchId`, and `teamKeyList` share one row,
              split by "or" dividers (see `teamActive`/`teamsInMatchActive`/
              `teamKeyListActive` above) - a stat that supports one supports
              all three (they all come from `scope === 'team'` in
              `registry.ts`), so in practice this row is either all three
              fields or none, never lopsided. All three stay visible at all
              times; the inactive ones' controls are disabled rather than
              removed, and every input here has `allowClear` so clearing
              whichever IS active re-enables the others. A bespoke flex row
              rather than the generic `Row` above - `Row` has no notion of a
              non-flexing divider child between its columns. */}
          {(catalogueEntry.supportedSelectors.includes('teamKey') ||
            catalogueEntry.supportedSelectors.includes('teamsInMatchId') ||
            catalogueEntry.supportedSelectors.includes('teamKeyList')) && (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: 16
              }}
            >
              {catalogueEntry.supportedSelectors.includes('teamKey') && (
                <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                  <Field label='Team'>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4
                      }}
                    >
                      {renderSelectorModeToggle(
                        'teamKey',
                        teamsInMatchActive || teamKeyListActive
                      )}
                      {spec.bindings?.teamKey !== undefined ? (
                        <Select
                          allowClear
                          disabled={teamsInMatchActive || teamKeyListActive}
                          style={{ width: '100%' }}
                          placeholder='Select a team variable'
                          value={spec.bindings.teamKey}
                          options={variablesForSelector('teamKey').map(
                            (variable) => ({
                              value: variable.name,
                              label: variable.label ?? variable.name
                            })
                          )}
                          onChange={(value: string | undefined) =>
                            patchBinding('teamKey', value)
                          }
                        />
                      ) : (
                        <Select
                          allowClear
                          disabled={teamsInMatchActive || teamKeyListActive}
                          style={{ width: '100%' }}
                          placeholder='All teams'
                          value={spec.selectors.teamKey}
                          showSearch
                          optionFilterProp='label'
                          options={teams.map((team) => ({
                            value: team.teamKey,
                            label: `${team.teamKey} - ${team.teamNameShort}`
                          }))}
                          onChange={(value: number | undefined) =>
                            patchSelector('teamKey', value)
                          }
                        />
                      )}
                    </div>
                  </Field>
                </div>
              )}

              {catalogueEntry.supportedSelectors.includes('teamKey') &&
                (catalogueEntry.supportedSelectors.includes('teamsInMatchId') ||
                  catalogueEntry.supportedSelectors.includes(
                    'teamKeyList'
                  )) && (
                  <Typography.Text
                    type='secondary'
                    style={{ fontSize: 12, flex: '0 0 auto' }}
                  >
                    or
                  </Typography.Text>
                )}

              {catalogueEntry.supportedSelectors.includes('teamsInMatchId') && (
                <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                  <Field label='Teams in Match'>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4
                      }}
                    >
                      {renderSelectorModeToggle(
                        'teamsInMatchId',
                        teamActive || teamKeyListActive
                      )}
                      {spec.bindings?.teamsInMatchId !== undefined ? (
                        <Select
                          allowClear
                          disabled={teamActive || teamKeyListActive}
                          style={{ width: '100%' }}
                          placeholder='Select a match variable'
                          value={spec.bindings.teamsInMatchId}
                          options={variablesForSelector('teamsInMatchId').map(
                            (variable) => ({
                              value: variable.name,
                              label: variable.label ?? variable.name
                            })
                          )}
                          onChange={(value: string | undefined) =>
                            patchBinding('teamsInMatchId', value)
                          }
                        />
                      ) : (
                        <MatchSelect
                          eventKey={eventKey}
                          disabled={teamActive || teamKeyListActive}
                          value={spec.selectors.teamsInMatchId}
                          placeholder='Select a match'
                          onChange={(value) =>
                            patchSelector('teamsInMatchId', value)
                          }
                        />
                      )}
                    </div>
                  </Field>
                </div>
              )}

              {catalogueEntry.supportedSelectors.includes('teamsInMatchId') &&
                catalogueEntry.supportedSelectors.includes('teamKeyList') && (
                  <Typography.Text
                    type='secondary'
                    style={{ fontSize: 12, flex: '0 0 auto' }}
                  >
                    or
                  </Typography.Text>
                )}

              {catalogueEntry.supportedSelectors.includes('teamKeyList') && (
                <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                  <Field label='Multiple Teams'>
                    {/* Value-only - no Value|Variable toggle (see
                        `BINDABLE_SELECTOR_KEYS`). A typeahead multiselect:
                        `showSearch` + `mode='multiple'` lets the producer
                        type to filter and pick any number of teams; each
                        already-picked team shows as its own removable tag,
                        and the trailing `allowClear` "x" clears the whole
                        list at once (re-enabling Team/Teams in Match). */}
                    <Select
                      mode='multiple'
                      allowClear
                      showSearch
                      disabled={teamActive || teamsInMatchActive}
                      style={{ width: '100%' }}
                      placeholder='Pick teams'
                      value={spec.selectors.teamKeyList ?? []}
                      optionFilterProp='label'
                      maxTagCount='responsive'
                      options={teams.map((team) => ({
                        value: team.teamKey,
                        label: `${team.teamKey} - ${team.teamNameShort}`
                      }))}
                      onChange={(value: number[]) => patchTeamKeyList(value)}
                    />
                  </Field>
                </div>
              )}
            </div>
          )}

          {catalogueEntry.supportedSelectors.includes('matchId') && (
            <Field label='Match'>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {renderSelectorModeToggle('matchId')}
                {spec.bindings?.matchId !== undefined ? (
                  <Select
                    style={{ width: '100%' }}
                    placeholder='Select a match variable'
                    value={spec.bindings.matchId}
                    options={variablesForSelector('matchId').map(
                      (variable) => ({
                        value: variable.name,
                        label: variable.label ?? variable.name
                      })
                    )}
                    onChange={(value: string) => patchBinding('matchId', value)}
                  />
                ) : (
                  <MatchSelect
                    eventKey={eventKey}
                    value={spec.selectors.matchId}
                    onChange={(value) => patchSelector('matchId', value)}
                  />
                )}
              </div>
            </Field>
          )}

          {catalogueEntry.supportedSelectors.includes('allianceSeed') && (
            <Field label='Alliance Seed'>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {renderSelectorModeToggle('allianceSeed')}
                {spec.bindings?.allianceSeed !== undefined ? (
                  <Select
                    style={{ width: '100%' }}
                    placeholder='Select an alliance variable'
                    value={spec.bindings.allianceSeed}
                    options={variablesForSelector('allianceSeed').map(
                      (variable) => ({
                        value: variable.name,
                        label: variable.label ?? variable.name
                      })
                    )}
                    onChange={(value: string) =>
                      patchBinding('allianceSeed', value)
                    }
                  />
                ) : (
                  <InputNumber
                    style={{ width: '100%' }}
                    min={1}
                    precision={0}
                    placeholder='All alliances'
                    value={spec.selectors.allianceSeed}
                    onChange={(value) =>
                      patchSelector(
                        'allianceSeed',
                        typeof value === 'number' ? value : undefined
                      )
                    }
                  />
                )}
              </div>
            </Field>
          )}
        </>
      )}

      <Divider style={{ margin: 0 }} />

      <Field label='Tournament Types'>
        <Select
          mode='multiple'
          allowClear
          style={{ width: '100%' }}
          placeholder='All tournament types'
          value={spec.filters.tournamentTypes ?? []}
          options={tournamentTypeOptions}
          onChange={handleTournamentTypesChange}
        />
      </Field>

      <Divider style={{ margin: 0 }} />
      <Typography.Text type='secondary' style={{ fontSize: 12 }}>
        Display Options
      </Typography.Text>

      <Row minChildWidth={150}>
        <Field label='Limit'>
          <InputNumber
            style={{ width: '100%' }}
            min={1}
            precision={0}
            value={spec.options.limit}
            onChange={(value) =>
              patchOptions({
                limit: typeof value === 'number' ? value : undefined
              })
            }
          />
        </Field>

        <Field label='Sort Direction'>
          <Select
            allowClear
            style={{ width: '100%' }}
            placeholder='Default'
            value={spec.options.sortDir}
            options={SORT_DIR_OPTIONS}
            onChange={(value: 'asc' | 'desc' | undefined) =>
              patchOptions({ sortDir: value })
            }
          />
        </Field>

        <Field label='Precision'>
          <InputNumber
            style={{ width: '100%' }}
            min={0}
            max={6}
            precision={0}
            value={spec.options.precision}
            onChange={(value) =>
              patchOptions({
                precision: typeof value === 'number' ? value : undefined
              })
            }
          />
        </Field>

        <Field label='Hold (ms)'>
          <InputNumber
            style={{ width: '100%' }}
            min={0}
            step={100}
            precision={0}
            value={spec.holdMs}
            onChange={(value) =>
              patch({ holdMs: typeof value === 'number' ? value : undefined })
            }
          />
        </Field>

        <Field label='Show Team Names'>
          <Switch
            checked={spec.options.showTeamNames ?? false}
            onChange={(checked) => patchOptions({ showTeamNames: checked })}
          />
        </Field>
      </Row>

      <Divider style={{ margin: 0 }} />
      <Typography.Text type='secondary' style={{ fontSize: 12 }}>
        Parameters
      </Typography.Text>
      <SchemaForm
        schema={catalogueEntry.paramsSchema}
        value={spec.params}
        onChange={(next) =>
          onChange({ ...spec, params: next as GraphicSpec['params'] })
        }
      />
    </div>
  );
};
