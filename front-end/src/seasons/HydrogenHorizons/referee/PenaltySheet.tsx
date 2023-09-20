import { FC } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import NumberInput from '@components/Referee/NumberInput';
import { Alliance, HydrogenHorizons, Match } from '@toa-lib/models';
import { useRecoilValue } from 'recoil';
import { matchInProgressAtom } from '@stores/NewRecoil';

interface Props {
  alliance: Alliance;
  onMatchItemUpdate: <K extends keyof Match<HydrogenHorizons.MatchDetails>>(
    key: K,
    value: Match<HydrogenHorizons.MatchDetails>[K]
  ) => void;
}

const PenaltySheet: FC<Props> = ({ alliance, onMatchItemUpdate }) => {
  const match = useRecoilValue(matchInProgressAtom);

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
