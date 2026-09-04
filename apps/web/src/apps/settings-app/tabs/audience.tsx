import { FC } from 'react';
import { socketApi } from 'src/api/use-socket-data.js';
import { Space } from 'antd';
import ColorRow from 'src/components/settings/color-row.js';
import { useAtom } from 'jotai';
import { displayChromaKeyAtom } from 'src/stores/state/audience-display.js';

const AudienceDisplaySettingsTab: FC = () => {
  const [chromaKey, setChromaKey] = useAtom(displayChromaKeyAtom);
  let timeout: any = null;

  const update = (key: string) => {
    setChromaKey(key);

    // Don't hammer the server with requests
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      socketApi.update.client(
        localStorage.getItem('persistantClientId') ?? '',
        {
          audienceDisplayChroma: key
        }
      );
    }, 1000);
  };

  return (
    <Space orientation='vertical' style={{ width: '100%' }}>
      <ColorRow
        title='Audience Display Chroma'
        value={chromaKey}
        onChange={update}
      />
    </Space>
  );
};

export default AudienceDisplaySettingsTab;
