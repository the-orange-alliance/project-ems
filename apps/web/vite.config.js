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
      src: resolve(__dirname, 'src'),
      '@assets': resolve(__dirname, './src/assets'),
      '@components': resolve(__dirname, './src/components'),
      '@features': resolve(__dirname, './src/features'),
      '@layouts': resolve(__dirname, './src/layouts'),
      '@seasons': resolve(__dirname, './src/seasons'),
      '@stores': resolve(__dirname, './src/stores'),
      '@api': resolve(__dirname, './src/api')
    }
  },
  optimizeDeps: {
    include: ['@toa-lib/client', '@toa-lib/models'],
    force: true /* Use this option when @toa-lib needs to be rebuilt for some weird reason. */
  }
});
