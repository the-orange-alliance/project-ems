import { FC } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import NumberInput from '@components/Referee/NumberInput';
import { Alliance, HydrogenHorizons, Match } from '@toa-lib/models';
import { useRecoilState } from 'recoil';
import { matchInProgressAtom } from '@stores/NewRecoil';

interface Props {
  alliance: Alliance;
  onUpdate?: (match: Match<HydrogenHorizons.MatchDetails>) => void;
}

const PenaltySheet: FC<Props> = ({ alliance, onUpdate }) => {
  const [match, setMatch] = useRecoilState(matchInProgressAtom);

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
