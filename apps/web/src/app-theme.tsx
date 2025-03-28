import { createTheme } from '@mui/material/styles';
import { ThemeConfig } from 'antd';

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

export const customfgcTheme: ThemeConfig = {
  token: {
    colorPrimary: '#019b00',
    colorPrimaryBg: '#ffffff',
    colorBgBase: '#ffffff',
    colorTextBase: '#000000',
    colorText: '#000000',
    colorTextSecondary: '#ffffff'
  },
  components: {
    Skeleton: {
      gradientFromColor: 'rgba(0, 0, 0, 0.06)',
      gradientToColor: 'rgba(0, 0, 0, 0.15)'
    },
    Table: {
      headerBg: '#e8e8e8',
      rowHoverBg: '#f1f1f1'
    },
    Button: {
      onlyIconSizeLG: '16px',
      colorLink: '#019b00',
      colorLinkHover: '#82ce81'
    },
    Layout: {
      bodyBg: '#f0f0f0'
    }
  }
};
