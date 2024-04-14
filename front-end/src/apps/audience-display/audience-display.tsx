import { FC, Suspense } from 'react';
import { useRecoilValue } from 'recoil';
import { SyncDisplayToRecoil } from 'src/components/sync-effects/sync-display-to-recoi';
import { SyncMatchStateToRecoil } from 'src/components/sync-effects/sync-match-state-to-recoil';
import { SyncOnPrestart } from 'src/components/sync-effects/sync-on-prestart';
import { SyncOnCommit } from 'src/components/sync-effects/sync-on-commit';
import ChromaLayout from 'src/layouts/ChromaLayout';
import { currentEventKeyAtom } from 'src/stores/NewRecoil';
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
        <SyncMatchStateToRecoil />
        <SyncOnPrestart />
        <SyncOnCommit />
        <SyncDisplayToRecoil />
        <DisplaySwitcher id={displayId} eventKey={eventKey} />
      </ChromaLayout>
    </Suspense>
  );
};
