import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.js'],

    env: {
      NODE_ENV: 'test',
    },

    fileParallelism: false,
  },
});
