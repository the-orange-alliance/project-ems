import { createTheme } from '@mui/material/styles';

export const ftcTheme = (darkMode: boolean) =>
  createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light'
    }
  });
