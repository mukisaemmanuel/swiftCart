import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const geminiKey = env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY || '';
  const buildTimestamp = Date.now().toString();

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'generate-version-json',
        buildStart() {
          try {
            const versionData = JSON.stringify(
              { version: buildTimestamp, updatedAt: new Date().toISOString() },
              null,
              2
            );
            fs.writeFileSync(path.resolve(process.cwd(), 'public/version.json'), versionData);
          } catch (e) {
            console.warn('Could not write public/version.json:', e);
          }
        },
        generateBundle() {
          this.emitFile({
            type: 'asset',
            fileName: 'version.json',
            source: JSON.stringify(
              { version: buildTimestamp, updatedAt: new Date().toISOString() },
              null,
              2
            ),
          });
        },
      },
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(geminiKey),
      'process.env.VITE_GEMINI_API_KEY': JSON.stringify(geminiKey),
      'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(geminiKey),
      '__APP_BUILD_TIME__': JSON.stringify(buildTimestamp),
    },
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, 'src'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
