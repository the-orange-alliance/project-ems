import { FC } from 'react';

import FGC_BG from '../res/global-bg.png';

const Blank: FC = () => {
  return <div id='fgc-body' style={{ backgroundImage: `url(${FGC_BG})` }} />;
};

export default Blank;
