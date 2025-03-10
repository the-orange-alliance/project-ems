import { FC, ReactNode, useEffect } from 'react';
import { useRecoilState } from 'recoil';
import { Breakpoint } from '@mui/material';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import { appbarConfigAtom } from '@stores/recoil';

interface Props {
  title?: string;
  titleLink?: string;
  containerWidth?: Breakpoint | false;
  children?: ReactNode;
}

export const DefaultLayout: FC<Props> = ({
  title,
  titleLink,
  containerWidth,
  children
}: Props) => {
  const [, updateAppbarConfig] = useRecoilState(appbarConfigAtom);

  useEffect(() => {
    updateAppbarConfig({
      title,
      titleLink
    });
  }, []);

  return (
    <Box sx={{ display: 'flex' }}>
      <Container
        maxWidth={containerWidth || 'xl'}
        sx={{ marginTop: (theme) => theme.spacing(10) }}
      >
        {children}
      </Container>
    </Box>
  );
};
