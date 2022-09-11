import { FC, useState } from 'react';
import Typography from '@mui/material/Typography';
import TwoColumnHeader from 'src/components/Headers/TwoColumnHeader';
import PaperLayout from 'src/layouts/PaperLayout';
import TournamentDropdown from 'src/components/Dropdowns/TournamentDropdown';
import { TEST_LEVEL } from '@toa-lib/models';

const MatchManager: FC = () => {
  const [selectedType, setSelectedType] = useState(TEST_LEVEL);

  const handleTournamentChange = (value: number) => setSelectedType(value);

  return (
    <PaperLayout
      header={
        <TwoColumnHeader
          left={<Typography variant='h4'>Match Manager</Typography>}
          right={
            <TournamentDropdown
              value={selectedType}
              onChange={handleTournamentChange}
            />
          }
        />
      }
      containerWidth='xl'
    >
      Content here?
    </PaperLayout>
  );
};

export default MatchManager;
