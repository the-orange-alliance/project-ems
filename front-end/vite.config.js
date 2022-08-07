// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['@toa-lib/client', '@toa-lib/models'],
    force: true /* Use this option when @toa-lib needs to be rebuilt for some weird reason. */
  },
  build: {
    commonjsOptions: {
      include: ['@toa-lib/client', '@toa-lib/models', /node_modules/]
    }
  }
});
