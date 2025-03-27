import { FC, JSX, Suspense, useEffect } from 'react';
import { Breakpoint, Container, Divider, Paper } from '@mui/material';
import { Box } from '@mui/material';
import { appbarConfigAtom } from '@stores/state/index.js';
import { useSetAtom } from 'jotai';

interface Props {
  title?: string;
  titleLink?: string;
  header?: JSX.Element | string;
  containerWidth?: Breakpoint | false;
  children?: JSX.Element;
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
  const updateAppbarConfig = useSetAtom(appbarConfigAtom);

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
