import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.less';
import App from './App';

const container = document.getElementById('root');
if (!container) throw new Error('Error while trying to find document root.');
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
