import { FC, ReactNode, Suspense, useEffect } from 'react';
import { useRecoilState } from 'recoil';
import { Breakpoint } from '@mui/material';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import { appbarConfigAtom } from '@stores/recoil';

interface Props {
  title?: string;
  titleLink?: string;
  header?: ReactNode | string;
  containerWidth?: Breakpoint | false;
  children?: ReactNode;
  padding?: boolean;
  showSettings?: boolean;
}

export const PaperLayout: FC<Props> = ({
  title,
  titleLink,
  header,
  containerWidth,
  children,
  padding,
  showSettings
}: Props) => {
  const [, updateAppbarConfig] = useRecoilState(appbarConfigAtom);

  useEffect(() => {
    updateAppbarConfig({
      title,
      titleLink,
      showSettings: showSettings
    });
  }, []);

  return (
    <Box sx={{ display: 'flex' }}>
      <Container
        maxWidth={containerWidth || 'xl'}
        sx={{ marginTop: (theme) => theme.spacing(12) }}
      >
        <Paper>
          {header && (
            <>
              <Box sx={{ padding: (theme) => theme.spacing(2) }}>{header}</Box>
              <Divider />
            </>
          )}
          <Box
            sx={{
              padding: padding ? (theme) => theme.spacing(2) : 0,
              position: 'relative'
            }}
          >
            <Suspense fallback={<div>Loading...</div>}>{children}</Suspense>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};
