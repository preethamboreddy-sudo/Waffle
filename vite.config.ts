import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, projectRoot, ['VITE_', 'API_']);
  const customerEntry = path.resolve(projectRoot, 'index.html');
  const adminEntry = path.resolve(projectRoot, 'admin/index.html');
  const input = mode === 'customer'
    ? customerEntry
    : mode === 'admin'
      ? adminEntry
      : { customer: customerEntry, admin: adminEntry };

  return {
    input,
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': projectRoot,
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        '/api': {
          target: env.API_SERVER_URL || 'http://127.0.0.1:3000',
        },
      },
    },
  };
});
