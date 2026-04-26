/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/graphql': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/bills': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/timesheets': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/templates': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['**/__tests__/**/*.spec.{ts,tsx}'],
    css: false,
  },
});
