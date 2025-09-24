import { createTheme } from '@mui/material/styles';
import { theme, ThemeConfig } from 'antd';

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
        default: darkMode ? '#121212' : '#f0f0f0'
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
        default: darkMode ? '#121212' : '#f0f0f0'
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
        default: darkMode ? '#121212' : '#f0f0f0'
      }
    }
  });

export const customfgcTheme = (darkMode: boolean): ThemeConfig => ({
  algorithm: darkMode
    ? [theme.darkAlgorithm, theme.compactAlgorithm]
    : [theme.compactAlgorithm],
  token: {
    colorPrimary: '#019b00',
    // colorPrimaryBg: '#ffffff',
    // colorBgBase: '#ffffff',
    colorTextBase: darkMode ? '#ffffff' : '#000000',
    colorText: darkMode ? '#ffffff' : '#000000',
    colorTextSecondary: darkMode ? '#000000' : '#ffffff'
  },
  components: {
    Skeleton: {
      gradientFromColor: 'rgba(0, 0, 0, 0.06)',
      gradientToColor: 'rgba(0, 0, 0, 0.15)'
    },
    Table: {
      headerBg: darkMode ? '#171717' : '#e8e8e8',
      rowHoverBg: darkMode ? '#0d0d0d' : '#f1f1f1'
    },
    Button: {
      onlyIconSizeLG: '16px',
      colorLink: '#019b00',
      colorLinkHover: '#82ce81'
    },
    Layout: {
      // bodyBg: '#f0f0f0'
    }
  }
});
