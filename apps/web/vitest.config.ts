import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

const root = import.meta.dirname;

export default defineConfig({
  root,
  resolve: {
    alias: {
      src: resolve(root, 'src'),
      '@assets': resolve(root, 'src/assets'),
      '@components': resolve(root, 'src/components'),
      '@features': resolve(root, 'src/features'),
      '@layouts': resolve(root, 'src/layouts'),
      '@seasons': resolve(root, 'src/seasons'),
      '@stores': resolve(root, 'src/stores'),
      '@api': resolve(root, 'src/api'),
      '@utils': resolve(root, 'src/utils'),
      '@workers': resolve(root, 'src/workers'),
      '@toa-lib/client': resolve(root, '../../libs/client/build'),
      '@toa-lib/models': resolve(root, '../../libs/models/build')
    }
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    clearMocks: true,
    restoreMocks: true,
    unstubGlobals: true,
    pool: 'vmThreads',
    fileParallelism: false,
    maxWorkers: 1
  }
});
