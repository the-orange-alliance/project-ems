// vite.config.js
import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      // Buffer borks the vite build, so exclude it and don't polyfill the global of it
      exclude: ['buffer'],
      globals: {
        Buffer: false
      }
    })
  ],
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
      '@stores': resolve(__dirname, './src/stores')
    }
  },
  optimizeDeps: {
    include: ['@toa-lib/client', '@toa-lib/models'],
    force: true /* Use this option when @toa-lib needs to be rebuilt for some weird reason. */
  }
});
