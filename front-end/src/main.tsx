import { StrictMode, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { RecoilRoot, useRecoilValue } from 'recoil';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterMoment } from '@mui/x-date-pickers/AdapterMoment';
import App from './App';
import { fgcTheme } from './AppTheme';
import { darkModeAtom } from './stores/Recoil';
import { APIOptions } from '@toa-lib/client';

const container = document.getElementById('root');
if (!container) throw new Error('Error while trying to find document root.');
const root = createRoot(container);

// Configure lib-ems
APIOptions.host = 'http://localhost';
APIOptions.port = 8080;

function Main() {
  const darkMode = useRecoilValue(darkModeAtom);
  return (
    <ThemeProvider theme={useMemo(() => fgcTheme(darkMode), [darkMode])}>
      <App />
    </ThemeProvider>
  );
}

root.render(
  <StrictMode>
    <BrowserRouter>
      <LocalizationProvider dateAdapter={AdapterMoment}>
        <RecoilRoot>
          <Main />
        </RecoilRoot>
      </LocalizationProvider>
    </BrowserRouter>
  </StrictMode>
);
