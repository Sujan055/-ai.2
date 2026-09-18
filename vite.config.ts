
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Fix: Define __dirname for ESM environments where it is not globally available
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        // Same-origin relay for Traceloop trace export (keeps the API key out of
        // the browser bundle; the dev proxy injects it server-side).
        proxy: {
          '/api/traceloop': {
            target: 'https://api.traceloop.com',
            changeOrigin: true,
            rewrite: (p: string) => p.replace(/^\/api\/traceloop/, '/v1/traces'),
            headers: env.TRACELOOP_API_KEY
              ? { Authorization: `Bearer ${env.TRACELOOP_API_KEY}` }
              : {},
          },
        },
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
