import { FC, Suspense } from 'react';
import { ChromaLayout } from 'src/layouts/chroma-layout.js';
import { DisplaySwitcher } from './displays/index.js';
import { useAtomValue } from 'jotai';
import { eventKeyAtom } from 'src/stores/state/event.js';
import { displayIdAtom } from 'src/stores/state/audience-display.js';

export const AudienceDisplay: FC = () => {
  const eventKey = useAtomValue(eventKeyAtom);
  const displayId = useAtomValue(displayIdAtom);
  return (
    <Suspense
      fallback={
        <div
          style={{
            position: 'absolute',
            height: '100vh',
            width: '100vw',
            backgroundColor: 'rgba(0,0,0,0)'
          }}
        />
      }
    >
      <ChromaLayout>
        <DisplaySwitcher id={displayId} eventKey={eventKey} />
      </ChromaLayout>
    </Suspense>
  );
};
