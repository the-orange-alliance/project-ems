import { FC, ReactNode } from 'react';
import { Typography, Divider } from 'antd';
import { useAtomValue } from 'jotai';
import { eventKeyAtom } from 'src/stores/state/index.js';
import { useEvent } from 'src/api/use-event-data.js';

interface Props {
  name: string;
  children?: ReactNode;
  pagebreak?: boolean;
}

export const Report: FC<Props> = ({ name, children, pagebreak }) => {
  const eventKey = useAtomValue(eventKeyAtom);
  const { data: event } = useEvent(eventKey);

  return (
    <div
      style={{
        marginTop: '16px',
        pageBreakAfter: pagebreak ? 'always' : 'avoid'
      }}
    >
      <Typography.Title
        level={2}
        style={{ textAlign: 'center', marginBottom: '8px' }}
      >
        {event?.eventName ?? ''}
      </Typography.Title>
      <Typography.Title
        level={3}
        style={{ textAlign: 'center', marginBottom: '16px' }}
      >
        {name}
      </Typography.Title>
      <Divider style={{ marginTop: '16px' }} />
      {children}
    </div>
  );
};
