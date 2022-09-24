import { FC } from 'react';
import ChromaLayout from 'src/layouts/ChromaLayout';
import './AudienceDisplay.less';
import MatchPlay from './displays/fgc_2022/MatchPlay/MatchPlay';

const AudienceDisplay: FC = () => {
  return (
    <ChromaLayout>
      <div id='aud-base'>
        <MatchPlay />
      </div>
    </ChromaLayout>
  );
};

export default AudienceDisplay;
