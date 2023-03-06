import { FC } from 'react';
import Box from '@mui/material/Box';
import { useRecoilState } from 'recoil';
import { displayChromaKeyAtom } from 'src/stores/NewRecoil';
import TextSetting from '../components/TextSetting';

const AudienceDisplaySettingsTab: FC = () => {
  const [chromaKey, setChromaKey] = useRecoilState(displayChromaKeyAtom);

  return (
    <Box>
      <TextSetting
        name='Audience Display Chroma'
        value={chromaKey}
        onChange={setChromaKey}
        inline
      />
    </Box>
  );
};

export default AudienceDisplaySettingsTab;
