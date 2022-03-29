import React from 'react';
import { createRoot } from 'react-dom/client';
import 'antd/dist/antd.css';
import './index.less';
import App from './App';

const container = document.getElementById('root');
if (!container) throw new Error('Error while trying to find document root.');
const root = createRoot(container);

// NOTE: Currently, antd does not support React.StrictMode, so we have to live without it for now...
root.render(<App />);
