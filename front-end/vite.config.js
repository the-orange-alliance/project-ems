// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['@toa-lib/client', '@toa-lib/models']
  },
  build: {
    commonjsOptions: {
      include: ['@toa-lib/client', '@toa-lib/models', /node_modules/]
    }
  }
});
