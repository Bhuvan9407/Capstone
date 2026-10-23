import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Dev API proxy keeps the SPA on one origin for cookies/CSRF simplicity.
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: false, // cookie domain stays visible to the dev backend
      },
    },
  },
  build: { outDir: 'dist', sourcemap: true },
});
