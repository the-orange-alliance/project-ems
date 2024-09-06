import { FC } from 'react';
import { RefereeScoreSheetProps } from '@seasons/index';
import { FeedingTheFuture } from '@toa-lib/models';
import TeleScoreSheet from './TeleOpScoreSheet';
import GenericScoreSheet from 'src/seasons/fgc-generic/referee/GenericScoreSheet';

const ScoreSheet: FC<RefereeScoreSheetProps> = ({ alliance }) => {
  return (
    <GenericScoreSheet<FeedingTheFuture.MatchDetails>
      alliance={alliance}
      TeleopScoreSheet={TeleScoreSheet}
    />
  );
};

export default ScoreSheet;
