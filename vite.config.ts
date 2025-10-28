import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import fs from 'fs';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  css: {
    postcss: './postcss.config.js',
  },
  server: {
    https: {
      key: fs.readFileSync('./localhost-key.pem'),
      cert: fs.readFileSync('./localhost.pem'),
    },
    host: true,
    port: 5179,
    hmr: {
      overlay: false
    }
  },
});
