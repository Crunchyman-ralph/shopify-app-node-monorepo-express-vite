import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
// import https from 'https';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

if (
  process.env.npm_lifecycle_event === 'build' &&
  !process.env.CI &&
  !process.env.SHOPIFY_API_KEY
) {
  console.warn(
    '\nBuilding the frontend app without an API key. The frontend build will not run without an API key. Set the SHOPIFY_API_KEY environment variable when running the build command.\n'
  );
}

const proxyOptions = {
  target: `http://127.0.0.1:${process.env.BACKEND_PORT}`,
  changeOrigin: false,
  secure: true,
  ws: false,
};

const host = process.env.HOST
  ? process.env.HOST.replace(/https?:\/\//, '')
  : 'localhost';

const hmrConfig =
  host === 'localhost'
    ? {
        protocol: 'ws',
        host: 'localhost',
        port: 64999,
        clientPort: 64999,
      }
    : {
        protocol: 'wss',
        host: host,
        port: Number.parseInt(process.env.FRONTEND_PORT!),
        clientPort: 443,
      };

const config = defineConfig({
  root: path.dirname(fileURLToPath(import.meta.url)),
  plugins: [tsconfigPaths(), react()],
  define: {
    'process.env.SHOPIFY_API_KEY': JSON.stringify(process.env.SHOPIFY_API_KEY),
  },
  resolve: {
    preserveSymlinks: true,
  },
  server: {
    host: 'localhost',
    port: Number.parseInt(process.env.FRONTEND_PORT!),
    hmr: hmrConfig,
    proxy: {
      '^/(\\?.*)?$': proxyOptions,
      '^/api(/|(\\?.*)?$)': proxyOptions,
    },
  },
});

export default config;
