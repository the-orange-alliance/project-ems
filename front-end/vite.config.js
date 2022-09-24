// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  root: './',
  publicDir: './public',
  resolve: {
    alias: {
      src: resolve(__dirname, 'src')
    }
  },
  optimizeDeps: {
    include: ['@toa-lib/client', '@toa-lib/models'],
    force: true /* Use this option when @toa-lib needs to be rebuilt for some weird reason. */
  },
  build: {
    commonjsOptions: {
      include: ['@toa-lib/client', '@toa-lib/models', /node_modules/]
    },
    rollupOptions: {
      external: ['node:events', 'events']
    }
  }
});
