import { DisplayModes } from '@toa-lib/models';
import { FC } from 'react';
import { AudDisplayDefault } from './ad-default';
import { AudDisplayTimer } from './ad-timer';
import { AudDisplayStream } from './ad-stream';

export interface DisplayProps {
  id: number;
  eventKey: string | null | undefined;
}

interface Props {
  id: number;
  eventKey: string | null | undefined;
  mode?: DisplayModes;
}

const Displays: FC<Props> = ({ id, mode = DisplayModes.DEFAULT, eventKey }) => {
  switch (mode) {
    case DisplayModes.DEFAULT:
      return <AudDisplayDefault id={id} eventKey={eventKey} />;
    case DisplayModes.TIMER_ONLY:
      return <AudDisplayTimer id={id} eventKey={eventKey} />;
    case DisplayModes.STREAM:
      return <AudDisplayStream id={id} eventKey={eventKey} />;
    default:
      return <AudDisplayDefault id={id} eventKey={eventKey} />;
  }
};

export default Displays;
