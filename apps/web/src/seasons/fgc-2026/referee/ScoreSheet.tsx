import { FC } from 'react';
import { RefereeScoreSheetProps } from '@seasons/index.js';
import { IgnitingInnovation } from '@toa-lib/models';
import TeleScoreSheet from './TeleOpScoreSheet.js';
import GenericScoreSheet from 'src/seasons/fgc-generic/referee/GenericScoreSheet.js';

const ScoreSheet: FC<RefereeScoreSheetProps> = ({ alliance, headReferee }) => {
  return (
    <GenericScoreSheet<IgnitingInnovation.MatchDetails>
      alliance={alliance}
      headReferee={headReferee}
      TeleopScoreSheet={TeleScoreSheet}
    />
  );
};

export default ScoreSheet;
