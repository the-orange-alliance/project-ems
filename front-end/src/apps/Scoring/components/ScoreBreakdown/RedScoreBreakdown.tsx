import { FC } from 'react';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import { useRecoilValue } from 'recoil';
import { matchInProgress } from 'src/stores/Recoil';
import {
  defaultCarbonCaptureDetails,
  isCarbonCaptureDetails
} from '@toa-lib/models';

const RedScoreBreakdown: FC = () => {
  const match = useRecoilValue(matchInProgress);
  const someDetails = match?.details;
  const details = isCarbonCaptureDetails(someDetails)
    ? someDetails
    : defaultCarbonCaptureDetails;

  const getLevelText = (level: number): string => {
    switch (level) {
      case 0:
        return 'NONE';
      case 1:
        return 'LEVEL 1';
      case 2:
        return 'LEVEL 2';
      case 3:
        return 'LEVEL 3';
      case 4:
        return 'LEVEL 4';
      default:
        return 'NONE';
    }
  };

  return (
    <Grid container spacing={3} sx={{ padding: (theme) => theme.spacing(1) }}>
      <Grid item xs={12} sm={6}>
        <Typography>{getLevelText(details.redRobotOneStorage)}</Typography>
      </Grid>
      <Grid item xs={12} sm={6}>
        <Typography>{details.carbonPoints}</Typography>
      </Grid>
      <Grid item xs={12} sm={6}>
        <Typography>{getLevelText(details.redRobotTwoStorage)}</Typography>
      </Grid>
      <Grid item xs={12} sm={6}>
        <Typography>{details.coopertitionBonusLevel}</Typography>
      </Grid>
      <Grid item xs={12} sm={6}>
        <Typography>{getLevelText(details.redRobotThreeStorage)}</Typography>
      </Grid>
      <Grid item xs={12} sm={6}>
        <Typography>{match?.redMinPen}</Typography>
      </Grid>
      <Grid item xs={12} sm={6} />
      <Grid item xs={12} sm={6}>
        <Typography>{match?.redScore}</Typography>
      </Grid>
    </Grid>
  );
};

export default RedScoreBreakdown;
