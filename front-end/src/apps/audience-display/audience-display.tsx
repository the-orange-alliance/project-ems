import { FC, Suspense } from 'react';
import { useRecoilValue } from 'recoil';
import { ChromaLayout } from 'src/layouts/chroma-layout';
import { currentEventKeyAtom } from 'src/stores/recoil';
import { DisplaySwitcher } from './displays';
import { displayIdAtom } from 'src/stores/recoil';

export const AudienceDisplay: FC = () => {
  const eventKey = useRecoilValue(currentEventKeyAtom);
  const displayId = useRecoilValue(displayIdAtom);
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
