import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  root: '.',
  publicDir: 'public',
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@client': path.resolve(__dirname, 'src/client'),
    },
  },
  server: {
    port: 5174,
    proxy: {
      '/api': 'http://localhost:9001',
      '/ws': {
        target: 'ws://localhost:9001',
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist/client',
  },
});
