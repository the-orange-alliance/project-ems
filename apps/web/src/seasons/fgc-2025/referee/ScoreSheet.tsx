import { FC } from 'react';
import { RefereeScoreSheetProps } from '@seasons/index.js';
import { EcoEquilibrium } from '@toa-lib/models';
import TeleScoreSheet from './TeleOpScoreSheet.js';
import GenericScoreSheet from 'src/seasons/fgc-generic/referee/GenericScoreSheet.js';

const ScoreSheet: FC<RefereeScoreSheetProps> = ({ alliance }) => {
  return (
    <GenericScoreSheet<EcoEquilibrium.MatchDetails>
      alliance={alliance}
      TeleopScoreSheet={TeleScoreSheet}
    />
  );
};

export default ScoreSheet;
