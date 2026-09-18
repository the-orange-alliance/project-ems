import { theme, ThemeConfig } from 'antd';

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
    // antd derives `colorTextLabel` (Segmented item text, form labels, etc.)
    // and every `<Typography.Text type="secondary">` from this. It must stay a
    // muted version of the *foreground*, not the background - a black value in
    // dark mode makes all of that text unreadable. The green appbar that used
    // to borrow this token for its contrasting text now sets its own colour.
    colorTextSecondary: darkMode
      ? 'rgba(255, 255, 255, 0.65)'
      : 'rgba(0, 0, 0, 0.65)'
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
      colorLinkHover: '#82ce81',
      ...(darkMode && {
        colorText: '#ffffff',
        colorBgTextHover: 'rgba(255, 255, 255, 0.04)',
        colorBgTextActive: 'rgba(255, 255, 255, 0.06)'
      })
    },
    Layout: {
      // bodyBg: '#f0f0f0'
    }
  }
});
