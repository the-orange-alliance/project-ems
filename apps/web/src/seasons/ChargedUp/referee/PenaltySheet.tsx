import { FC } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { NumberInput } from 'src/components/inputs/number-input';
import { Alliance, ChargedUpDetails, Match } from '@toa-lib/models';
import { useRecoilState } from 'recoil';
import { matchOccurringAtom } from '@stores/recoil';

interface Props {
  alliance: Alliance;
  onUpdate?: (match: Match<ChargedUpDetails>) => void;
}

const PenaltySheet: FC<Props> = ({ alliance, onUpdate }) => {
  const [match, setMatch] = useRecoilState(matchOccurringAtom);

  const handleFoulChange = (minPen: number) => {
    if (match) {
      const newMatch = Object.assign({}, match);
      if (alliance === 'red') {
        newMatch.redMinPen = minPen;
      } else {
        newMatch.blueMinPen = minPen;
      }
      setMatch(newMatch);
      onUpdate?.(newMatch);
    }
  };

  const handleTechFoulChange = (majPen: number) => {
    if (match) {
      const newMatch = Object.assign({}, match);
      if (alliance === 'red') {
        newMatch.redMajPen = majPen;
      } else {
        newMatch.blueMinPen = majPen;
      }
      setMatch(newMatch);
      onUpdate?.(newMatch);
    }
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
      <Typography variant='h6'>Tech Fouls</Typography>
      <NumberInput
        value={(alliance === 'red' ? match?.redMajPen : match?.blueMajPen) || 0}
        onChange={handleTechFoulChange}
      />
    </Box>
  );
};

export default PenaltySheet;
