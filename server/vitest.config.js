import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globalSetup: 'tests/global-setup.js',
    include: ['tests/**/*.test.js'],
    hookTimeout: 120_000,
    testTimeout: 120_000,
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    fileParallelism: false,
  },
});
