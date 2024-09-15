import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import {
  Alliance,
  Match,
  MatchDetailBase
} from '@toa-lib/models';
import { useRecoilValue } from 'recoil';
import { matchOccurringAtom } from '@stores/recoil';
import { NumberInput } from 'src/components/inputs/number-input';

interface Props<DetailsType extends MatchDetailBase> {
  alliance: Alliance;
  onMatchItemUpdate: <K extends keyof Match<DetailsType>>(
    key: K,
    value: Match<DetailsType>[K]
  ) => void;
}

const PenaltySheet = <DetailsType extends MatchDetailBase>({
  alliance,
  onMatchItemUpdate
}: Props<DetailsType>) => {
  const match = useRecoilValue(matchOccurringAtom);

  const handleFoulChange = (minPen: number) => {
    onMatchItemUpdate(alliance === 'red' ? 'redMinPen' : 'blueMinPen', minPen);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        width: '100%',
        alignItems: 'center'
      }}
    >
      <Typography variant='h6'>Fouls</Typography>
      <NumberInput
        value={(alliance === 'red' ? match?.redMinPen : match?.blueMinPen) || 0}
        onChange={handleFoulChange}
      />
    </Box>
  );
};

export default PenaltySheet;
