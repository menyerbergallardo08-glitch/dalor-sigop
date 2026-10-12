import { defineConfig } from 'vite';
import { resolve } from 'path';
import injectHTML from 'vite-plugin-html-inject';

export default defineConfig({
  root: '.',
  base: '/',
  plugins: [
    injectHTML(),
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
      output: {
        manualChunks(id) {
          if (id.includes('modules/financial/cxc')) return 'financial-cxc';
          if (id.includes('modules/financial/cxp')) return 'financial-cxp';
          if (id.includes('modules/financial/treasury')) return 'financial-treasury';
          if (id.includes('modules/financial')) return 'financial-core';
          if (id.includes('modules/projects/projects_tracking')) return 'projects-tracking';
          if (id.includes('modules/projects/projects_requisitions')) return 'projects-requisitions';
          if (id.includes('modules/projects')) return 'projects-core';
          if (id.includes('modules/maintenance')) return 'maintenance';
          if (id.includes('modules/resources')) return 'resources';
          if (id.includes('modules/dispatch')) return 'dispatch';
          if (id.includes('modules/expenses')) return 'expenses';
          if (id.includes('modules/quotations')) return 'quotations';
          if (id.includes('modules/rentals')) return 'rentals';
          if (id.includes('modules/materials')) return 'materials';
        }
      }
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      }
    },
  },
});
