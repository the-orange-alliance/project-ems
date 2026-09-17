import { FC, ReactNode, useState } from 'react';
import {
  Button,
  ConfigProvider,
  Empty,
  InputNumber,
  Segmented,
  Select,
  Space,
  Typography,
  message,
  theme
} from 'antd';
import {
  CopyOutlined,
  DeleteOutlined,
  HolderOutlined,
  PlusOutlined
} from '@ant-design/icons';
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import {
  restrictToParentElement,
  restrictToVerticalAxis
} from '@dnd-kit/modifiers';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FGC26FCS } from '@toa-lib/models';

type Step = FGC26FCS.PrepFieldStep;
type BranchStep = FGC26FCS.PrepFieldBranchStep;

const DURATION_STEP = 0.1;
const POWER_STEP = 0.05;
// New steps/branches start as a 1-second action.
const NEW_STEP_DURATION = 1;

const newMotorStep = (): BranchStep => ({
  type: 'motor',
  motor: 'door',
  power: 0.25,
  duration: NEW_STEP_DURATION
});
const newWaitStep = (): BranchStep => ({
  type: 'wait',
  duration: NEW_STEP_DURATION
});
const newParallelStep = (): Step => ({
  type: 'parallel',
  branches: [[newMotorStep()]]
});

const round1 = (value: number) => Math.round(value * 10) / 10;

const replaceAt = <T,>(list: T[], index: number, item: T): T[] =>
  list.map((existing, i) => (i === index ? item : existing));

const removeAt = <T,>(list: T[], index: number): T[] =>
  list.filter((_, i) => i !== index);

interface SortableListProps {
  ids: string[];
  onMove: (from: number, to: number) => void;
  gap?: number;
  children: ReactNode;
}

/**
 * One drag-to-reorder list. Each list is its own DndContext, so steps can't
 * be dragged between the top level and a branch (or between branches) - a
 * move like that is a cut-and-paste of different step lists, not a reorder.
 *
 * Renders its own plain flex column: restrictToParentElement clamps a dragged
 * row to its DOM parent, so the rows must be direct children of the full list
 * element (antd's Space would wrap each row in a row-sized div and pin it in
 * place).
 */
const SortableList: FC<SortableListProps> = ({
  ids,
  onMove,
  gap = 8,
  children
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );
  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id) {
      onMove(ids.indexOf(String(active.id)), ids.indexOf(String(over.id)));
    }
  };
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      // Keep the dragged row on the vertical axis and inside its own list so
      // dragging can't push the page into overflow.
      modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div
          style={{ display: 'flex', flexDirection: 'column', gap, width: '100%' }}
        >
          {children}
        </div>
      </SortableContext>
    </DndContext>
  );
};

interface SortableItemProps {
  id: string;
  children: ReactNode;
}

/** A draggable row with a grab handle on the left. */
const SortableItem: FC<SortableItemProps> = ({ id, children }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 1 : undefined,
        position: 'relative',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 4
      }}
    >
      <Button
        type='text'
        icon={<HolderOutlined />}
        style={{ cursor: isDragging ? 'grabbing' : 'grab', touchAction: 'none' }}
        {...attributes}
        {...listeners}
      />
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  );
};

interface LeafStepRowProps {
  step: BranchStep;
  /** Largest value this step's duration may take without busting the total budget. */
  durationMax: number;
  onChange: (step: BranchStep) => void;
  /** Omitted when deleting is not allowed (the only step in a branch). */
  onDelete?: () => void;
}

/** One motor or wait step: a type dropdown plus only the fields that apply. */
const LeafStepRow: FC<LeafStepRowProps> = ({
  step,
  durationMax,
  onChange,
  onDelete
}) => (
  <Space wrap>
    <Select
      value={step.type}
      variant='filled'
      style={{ width: 110 }}
      onChange={(type) =>
        onChange(
          type === 'motor'
            ? { ...newMotorStep(), duration: step.duration }
            : { type: 'wait', duration: step.duration }
        )
      }
      options={[
        { value: 'motor', label: 'Run motor' },
        { value: 'wait', label: 'Wait' }
      ]}
    />
    {step.type === 'motor' && (
      <>
        <Select
          value={step.motor}
          variant='filled'
          style={{ width: 110 }}
          onChange={(motor: FGC26FCS.PrepFieldMotor) =>
            onChange({ ...step, motor })
          }
          options={[
            { value: 'door', label: 'Door' },
            { value: 'blowers', label: 'Blowers' }
          ]}
        />
        <InputNumber
          value={step.power}
          variant='filled'
          onChange={(power) => {
            if (power === null) return;
            onChange({ ...step, power: Math.max(-1, Math.min(1, power)) });
          }}
          min={-1}
          max={1}
          step={POWER_STEP}
          prefix={
            <Typography.Text type='secondary' style={{ fontSize: 12 }}>
              Power
            </Typography.Text>
          }
          style={{ width: 130 }}
        />
      </>
    )}
    <InputNumber
      value={step.duration}
      variant='filled'
      onChange={(duration) => {
        if (duration === null) return;
        onChange({
          ...step,
          duration: round1(
            Math.max(DURATION_STEP, Math.min(durationMax, duration))
          )
        });
      }}
      min={DURATION_STEP}
      max={durationMax}
      step={DURATION_STEP}
      prefix={
        <Typography.Text type='secondary' style={{ fontSize: 12 }}>
          Seconds
        </Typography.Text>
      }
      style={{ width: 150 }}
    />
    <Button
      type='text'
      danger
      icon={<DeleteOutlined />}
      disabled={!onDelete}
      onClick={onDelete}
    />
  </Space>
);

interface PrepFieldSequenceEditorProps {
  value: Step[];
  onChange: (steps: Step[]) => void;
}

/**
 * Structured editor for the prep-field sequence. Every control is constrained
 * so an invalid sequence (unknown motors, out-of-range powers or durations,
 * empty parallel branches, nested parallels, budget overruns) simply cannot be
 * built - the robot-side validator only guards data written by other means.
 */
export const PrepFieldSequenceEditor: FC<PrepFieldSequenceEditorProps> = ({
  value,
  onChange
}) => {
  const { token } = theme.useToken();
  const [showJson, setShowJson] = useState(false);
  const totalDuration = FGC26FCS.prepFieldSequenceDuration(value);
  // Conservative headroom: raising any single duration by X raises the total
  // by at most X (parallel branches may raise it less), so capping each input
  // at its current value plus the remaining budget keeps the total in bounds.
  const durationMaxFor = (current: number) =>
    round1(
      Math.min(
        FGC26FCS.PREP_FIELD_MAX_STEP_DURATION,
        current + (FGC26FCS.PREP_FIELD_MAX_TOTAL_DURATION - totalDuration)
      )
    );
  const canAddStep =
    value.length < FGC26FCS.PREP_FIELD_MAX_STEPS &&
    totalDuration + NEW_STEP_DURATION <=
      FGC26FCS.PREP_FIELD_MAX_TOTAL_DURATION;

  const updateBranch = (
    step: Extract<Step, { type: 'parallel' }>,
    branchIndex: number,
    branch: BranchStep[]
  ): Step => ({
    ...step,
    branches: replaceAt(step.branches, branchIndex, branch)
  });

  const topIds = value.map((_, i) => `step-${i}`);

  return (
    <Space direction='vertical' style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        {/* The app theme inverts colorTextSecondary, which Segmented derives
            its unselected label color from - pin it to the normal text color
            so the unselected option stays readable. */}
        <ConfigProvider
          theme={{
            components: {
              Segmented: {
                itemColor: token.colorText,
                itemHoverColor: token.colorText
              }
            }
          }}
        >
          <Segmented
            value={showJson ? 'JSON' : 'Editor'}
            onChange={(mode) => setShowJson(mode === 'JSON')}
            options={['Editor', 'JSON']}
          />
        </ConfigProvider>
      </div>
      {showJson && (
        <div style={{ position: 'relative' }}>
          <pre
            style={{
              background: token.colorFillQuaternary,
              borderRadius: token.borderRadiusLG,
              padding: '8px 12px',
              margin: 0,
              overflowX: 'auto',
              fontSize: 12
            }}
          >
            {JSON.stringify(value, null, 2)}
          </pre>
          <Button
            type='text'
            icon={<CopyOutlined />}
            style={{ position: 'absolute', top: 4, right: 4 }}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(
                  JSON.stringify(value, null, 2)
                );
                message.success('Copied to clipboard');
              } catch {
                message.error('Copy failed');
              }
            }}
          />
        </div>
      )}
      {!showJson && value.length === 0 && (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description='No steps - the robot will do nothing on "Prepare Field". Add a step below.'
        />
      )}
      {!showJson && (
        <>
      <SortableList
        ids={topIds}
        onMove={(from, to) => onChange(arrayMove(value, from, to))}
      >
        {value.map((step, i) => {
            const remove = () => onChange(removeAt(value, i));

            if (step.type !== 'parallel') {
              return (
                <SortableItem key={topIds[i]} id={topIds[i]}>
                  <LeafStepRow
                    step={step}
                    durationMax={durationMaxFor(step.duration)}
                    onChange={(next) => onChange(replaceAt(value, i, next))}
                    onDelete={remove}
                  />
                </SortableItem>
              );
            }

            return (
              <SortableItem key={topIds[i]} id={topIds[i]}>
                <div
                  style={{
                    background: token.colorFillQuaternary,
                    borderRadius: token.borderRadiusLG,
                    padding: '8px 12px'
                  }}
                >
                  <Space direction='vertical' style={{ width: '100%' }} size={4}>
                    <Space>
                      <Typography.Text strong>
                        Run at the same time
                      </Typography.Text>
                      <Button
                        type='text'
                        danger
                        icon={<DeleteOutlined />}
                        onClick={remove}
                      />
                    </Space>
                    {step.branches.map((branch, b) => {
                      const branchIds = branch.map(
                        (_, j) => `step-${i}-branch-${b}-item-${j}`
                      );
                      return (
                        <div
                          key={b}
                          style={{
                            marginLeft: 4,
                            paddingLeft: 12,
                            borderLeft: `2px solid ${token.colorBorderSecondary}`
                          }}
                        >
                          <Space
                            direction='vertical'
                            style={{ width: '100%' }}
                            size={4}
                          >
                            <Space>
                              <Typography.Text type='secondary'>
                                Branch {b + 1}
                              </Typography.Text>
                              <Button
                                type='text'
                                size='small'
                                danger
                                // A parallel group always keeps at least one
                                // branch; delete the whole group instead.
                                disabled={step.branches.length === 1}
                                onClick={() =>
                                  onChange(
                                    replaceAt(value, i, {
                                      ...step,
                                      branches: removeAt(step.branches, b)
                                    })
                                  )
                                }
                              >
                                Remove branch
                              </Button>
                            </Space>
                            <SortableList
                              ids={branchIds}
                              gap={4}
                              onMove={(from, to) =>
                                onChange(
                                  replaceAt(
                                    value,
                                    i,
                                    updateBranch(
                                      step,
                                      b,
                                      arrayMove(branch, from, to)
                                    )
                                  )
                                )
                              }
                            >
                              {branch.map((branchStep, j) => (
                                  <SortableItem
                                    key={branchIds[j]}
                                    id={branchIds[j]}
                                  >
                                    <LeafStepRow
                                      step={branchStep}
                                      durationMax={durationMaxFor(
                                        branchStep.duration
                                      )}
                                      onChange={(next) =>
                                        onChange(
                                          replaceAt(
                                            value,
                                            i,
                                            updateBranch(
                                              step,
                                              b,
                                              replaceAt(branch, j, next)
                                            )
                                          )
                                        )
                                      }
                                      onDelete={
                                        // Branches can't be empty; remove the
                                        // branch instead.
                                        branch.length > 1
                                          ? () =>
                                              onChange(
                                                replaceAt(
                                                  value,
                                                  i,
                                                  updateBranch(
                                                    step,
                                                    b,
                                                    removeAt(branch, j)
                                                  )
                                                )
                                              )
                                          : undefined
                                      }
                                    />
                                  </SortableItem>
                                ))}
                            </SortableList>
                            <Space wrap size={0}>
                              <Button
                                type='text'
                                size='small'
                                icon={<PlusOutlined />}
                                disabled={!canAddStep}
                                onClick={() =>
                                  onChange(
                                    replaceAt(
                                      value,
                                      i,
                                      updateBranch(step, b, [
                                        ...branch,
                                        newMotorStep()
                                      ])
                                    )
                                  )
                                }
                              >
                                Motor
                              </Button>
                              <Button
                                type='text'
                                size='small'
                                icon={<PlusOutlined />}
                                disabled={!canAddStep}
                                onClick={() =>
                                  onChange(
                                    replaceAt(
                                      value,
                                      i,
                                      updateBranch(step, b, [
                                        ...branch,
                                        newWaitStep()
                                      ])
                                    )
                                  )
                                }
                              >
                                Wait
                              </Button>
                            </Space>
                          </Space>
                        </div>
                      );
                    })}
                    <Button
                      type='text'
                      size='small'
                      icon={<PlusOutlined />}
                      disabled={
                        step.branches.length >=
                          FGC26FCS.PREP_FIELD_MAX_BRANCHES || !canAddStep
                      }
                      onClick={() =>
                        onChange(
                          replaceAt(value, i, {
                            ...step,
                            branches: [...step.branches, [newMotorStep()]]
                          })
                        )
                      }
                    >
                      Add branch
                    </Button>
                  </Space>
                </div>
              </SortableItem>
            );
          })}
      </SortableList>
      <Space wrap>
        <Button
          icon={<PlusOutlined />}
          disabled={!canAddStep}
          onClick={() => onChange([...value, newMotorStep()])}
        >
          Motor step
        </Button>
        <Button
          icon={<PlusOutlined />}
          disabled={!canAddStep}
          onClick={() => onChange([...value, newWaitStep()])}
        >
          Wait step
        </Button>
        <Button
          icon={<PlusOutlined />}
          disabled={!canAddStep}
          onClick={() => onChange([...value, newParallelStep()])}
        >
          Parallel group
        </Button>
      </Space>
        </>
      )}
      <Typography.Text type='secondary'>
        Nominal sequence duration: {totalDuration.toFixed(1)}s (limit{' '}
        {FGC26FCS.PREP_FIELD_MAX_TOTAL_DURATION}s)
      </Typography.Text>
    </Space>
  );
};
