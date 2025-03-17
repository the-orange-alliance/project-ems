import { FC } from 'react';
import Box from '@mui/material/Box';
import { useRecoilState } from 'recoil';
import { displayChromaKeyAtom } from 'src/stores/recoil';
import { TextSetting } from '../components/text-setting';
import { updateSocketClient } from 'src/api/use-socket-data';

const AudienceDisplaySettingsTab: FC = () => {
  const [chromaKey, setChromaKey] = useRecoilState(displayChromaKeyAtom);
  let timeout: any = null;

  const update = (key: string | number) => {
    setChromaKey(key);

    // Don't hammer the server with requests
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      updateSocketClient(localStorage.getItem('persistantClientId') ?? '', {
        audienceDisplayChroma: key
      });
    }, 1000);
  };

  return (
    <Box>
      <TextSetting
        name='Audience Display Chroma'
        value={chromaKey}
        onChange={update}
        inline
      />
    </Box>
  );
};

export default AudienceDisplaySettingsTab;
