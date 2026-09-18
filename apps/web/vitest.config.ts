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
    // Ant Design + jsdom initialization can exceed Vitest's 5s default on
    // production Windows workstations even when assertions complete normally.
    testTimeout: 30_000,
    // Not vmThreads: it shares source-module state between test files in the
    // same worker, so module-scoped singletons (the background query
    // scheduler, single-flight recovery maps) leak across files and tests
    // fail depending on file order.
    pool: 'forks',
    fileParallelism: false,
    maxWorkers: 1
  }
});
