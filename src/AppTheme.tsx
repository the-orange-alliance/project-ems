import { createTheme } from '@mui/material/styles';

export const ftcTheme = (darkMode: boolean) =>
  createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
      primary: {
        main: '#d87800'
      },
      secondary: {
        main: '#f50057'
      },
      background: {
        default: '#f0f0f0'
      }
    }
  });

export const frcTheme = (darkMode: boolean) =>
  createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
      primary: {
        main: '#0065b3'
      },
      secondary: {
        main: '#f50057'
      },
      background: {
        default: '#f0f0f0'
      }
    }
  });

export const fgcTheme = (darkMode: boolean) =>
  createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
      primary: {
        main: '#019b00'
      },
      secondary: {
        main: '#f50057'
      },
      background: {
        default: '#f0f0f0'
      }
    }
  });
