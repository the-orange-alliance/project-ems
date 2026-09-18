import { useState, type FC, type ReactNode } from 'react';
import type { GraphicSpec, VizFrame } from '@toa-lib/models';
import AbsolouteLocator from 'src/components/util/absoloute-locator.js';
import {
  useGraphicTransition,
  type ContentLayer,
  type GraphicSnapshot,
  type TransitionAuthority
} from './transition-engine.js';
import ContentCrossfade from './content-crossfade.js';
import { TransitionContainer } from './transition-container.js';
import { FullscreenPayload, FullscreenShell } from './containers/fullscreen.js';
import { DrawerPayload, DrawerShell } from './containers/drawer.js';
import {
  LowerThirdPayload,
  LowerThirdShell
} from './containers/lower-third.js';
import { GraphicRenderer } from './renderers/index.js';

export interface StatsGraphicDisplayProps {
  spec: GraphicSpec | null;
  frame: VizFrame | null;
  authority?: TransitionAuthority;
  /** Explicit PVW capability: program ignores replay inputs. */
  preview?: boolean;
  replayNonce?: number;
  replayFrom?: GraphicSnapshot | null;
  onRenderError?: (error: Error, spec: GraphicSpec, frame: VizFrame) => void;
}

/** Shared broadcast composition. All mounted snapshots, phases and motion come from the machine. */
export const StatsGraphicDisplay: FC<StatsGraphicDisplayProps> = ({
  spec,
  frame,
  authority,
  preview = false,
  replayNonce,
  replayFrom,
  onRenderError
}) => {
  const transition = useGraphicTransition(
    spec,
    frame,
    replayNonce,
    replayFrom,
    authority,
    preview
  );
  const [failedKey, setFailedKey] = useState<string | null>(null);
  const current = transition.layers.at(-1);
  if (!current || current.key === failedKey || !transition.containerMode)
    return null;

  const renderLayer = (layer: ContentLayer) => {
    if (layer.key === failedKey) return null;
    const graphic = (
      <GraphicRenderer
        key={layer.key}
        spec={layer.spec}
        frame={layer.frame}
        pagingOriginMs={layer.pagingOriginMs}
        onRenderError={(error, failedSpec, failedFrame) => {
          setFailedKey(layer.key);
          onRenderError?.(error, failedSpec, failedFrame);
        }}
      />
    );
    const props = {
      title: layer.spec.title,
      subtitle: layer.spec.subtitle,
      children: graphic
    };
    switch (layer.spec.mode) {
      case 'fullscreen':
        return <FullscreenPayload {...props} />;
      case 'drawer-left':
      case 'drawer-right':
        return <DrawerPayload {...props} />;
      case 'lower-third':
        return <LowerThirdPayload {...props} />;
    }
  };
  const content = (
    <ContentCrossfade
      layers={transition.layers}
      motion={transition.contentMotion}
      nowMs={transition.sampledAtMs}
      renderLayer={renderLayer}
    />
  );
  let shell: ReactNode;
  switch (transition.containerMode) {
    case 'fullscreen':
      shell = <FullscreenShell>{content}</FullscreenShell>;
      break;
    case 'drawer-left':
      shell = <DrawerShell side='left'>{content}</DrawerShell>;
      break;
    case 'drawer-right':
      shell = <DrawerShell side='right'>{content}</DrawerShell>;
      break;
    case 'lower-third':
      shell = <LowerThirdShell>{content}</LowerThirdShell>;
      break;
  }
  return (
    <AbsolouteLocator top={0} left={0} right={0} bottom={0}>
      <TransitionContainer
        key={transition.containerMode}
        mode={transition.containerMode}
        motion={transition.containerMotion}
        nowMs={transition.sampledAtMs}
      >
        {shell}
      </TransitionContainer>
    </AbsolouteLocator>
  );
};
export default StatsGraphicDisplay;
