import { FC, ReactNode, useEffect } from 'react';
import { useRecoilState } from 'recoil';
import { Breakpoint } from '@mui/material';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import CssBaseline from '@mui/material/CssBaseline';
import { appbarConfigAtom } from '@stores/recoil';


interface Props {
  title?: string;
  titleLink?: string;
  containerWidth?: Breakpoint | false;
  children?: ReactNode;
}

export const RefereeLayout: FC<Props> = ({
  title,
  titleLink,
  containerWidth,
  children
}: Props) => {  
  const [appbarConfig, updateAppbarConfig] = useRecoilState(appbarConfigAtom);

  useEffect(() => {
    updateAppbarConfig({
      title,
      titleLink,
      showFullscreen: true
    });      
  }, []);

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <Container
        maxWidth={containerWidth || 'xl'}
        sx={{ marginTop: (theme) => theme.spacing(12) }}
      >
        {children}
      </Container>
    </Box>
  );
};
