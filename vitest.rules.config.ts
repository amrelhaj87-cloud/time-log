import { defineConfig } from 'vitest/config';

// Firestore security-rules tests (need the emulator): `npm run test:rules`.
export default defineConfig({
  test: {
    include: ['tests/rules/**/*.rules.ts'],
    testTimeout: 20000,
    hookTimeout: 60000,
    fileParallelism: false
  }
});
