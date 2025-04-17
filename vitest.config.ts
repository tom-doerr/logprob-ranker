/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

// Configure Vitest (https://vitest.dev/config/)
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./client/src/tests/setup.ts'],
    include: ['./client/src/tests/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      reporter: ['text', 'json', 'html'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client/src/components'),
      '@assets': path.resolve(__dirname, './attached_assets'),
      '@lib': path.resolve(__dirname, './client/src/lib'),
      '@hooks': path.resolve(__dirname, './client/src/hooks'),
      '@shared': path.resolve(__dirname, './shared'),
      '@utils': path.resolve(__dirname, './client/src/utils'),
      '@stores': path.resolve(__dirname, './client/src/stores'),
      '@services': path.resolve(__dirname, './client/src/services'),
    },
  },
});