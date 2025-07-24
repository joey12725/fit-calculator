import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['apps/web/__tests__/*.test.tsx'],
  },
});
