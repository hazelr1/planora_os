import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Standalone build: inlines all JS/CSS into one index.html so the app can be
// opened directly as a file, with no dev server or deployment needed. Kept
// separate from vite.config.ts so the normal dev/production build stays
// code-split and optimized for real hosting.
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    outDir: 'dist-standalone',
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
    chunkSizeWarningLimit: 100_000,
  },
});
