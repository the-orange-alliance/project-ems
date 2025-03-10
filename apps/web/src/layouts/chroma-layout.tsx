import { FC, ReactNode } from 'react';
import { Box, Typography } from '@mui/material';
import { useRecoilValue } from 'recoil';
import { displayChromaKeyAtom, socketConnectedAtom } from 'src/stores/recoil';

interface Props {
  children?: ReactNode;
}

export const ChromaLayout: FC<Props> = ({ children }) => {
  const chromaKey = useRecoilValue(displayChromaKeyAtom);
  const connected = useRecoilValue(socketConnectedAtom);
  return (
    <Box>
      {!connected && (
        <Typography
          variant='h5'
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            textAlign: 'center',
            color: 'black',
            fontWeight: 'bold',
            '-webkit-text-stroke': '.5px white'
          }}
        >
          Socket Not Connected!
        </Typography>
      )}
      {/* because mui is dumb */}
      <style>
        {`
          body {
            background: ${
              chromaKey
                ? chromaKey.startsWith('#')
                  ? chromaKey
                  : `#${chromaKey}`
                : '#00000000'
            };
          }
        `}
      </style>
      <Box
        // because I suck at css
        sx={{
          height: '100vh',
          width: '100vw',
          overflow: 'hidden'
        }}
      >
        {children}
      </Box>
    </Box>
  );
};
