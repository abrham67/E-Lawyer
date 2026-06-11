import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
// @ts-ignore - runtime plugin, types may not be resolved in this TS context
import mkcert from 'vite-plugin-mkcert';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Allow overriding host/port for stable LAN dev
  const env = process.env;
  const PORT = Number(env.VITE_PORT || 5180);
  const STRICT_PORT = String(env.VITE_STRICT_PORT || '').toLowerCase() === 'true';
  const DEV_HOST = env.VITE_DEV_HOST || undefined; // e.g., "192.168.1.4" or a hostname
  return ({
  server: {
    host: "0.0.0.0",
    port: PORT,
    strictPort: STRICT_PORT,
  // Use trusted HTTPS in dev (mkcert) so getUserMedia works on LAN/IP
  https: true as any,
    hmr: {
      protocol: 'wss',
      host: DEV_HOST, // if undefined, Vite will infer; set explicitly for cross-device HMR over HTTPS
      ...(STRICT_PORT ? { port: PORT } : {}),
    },
    proxy: {
      '/api': {
        target: 'http://localhost:5100',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
      // Serve uploaded files from backend in dev
      '/uploads': {
        target: 'http://localhost:5100',
        changeOrigin: true,
        secure: false,
      },
      // Proxy Socket.IO (custom path) to backend to avoid cross-origin and ad blockers
      '/ws': {
        target: 'http://localhost:5100',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },
  plugins: [
    react(),
    // Generate locally-trusted certificates for HTTPS dev (supports LAN/IP)
    mkcert({
      // Avoid default user profile dir to prevent EBUSY/lock issues on Windows
      savePath: path.resolve(__dirname, '.cert'),
    }),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;

          if (id.includes('recharts') || id.includes('d3-')) {
            return 'vendor-charts';
          }

          if (id.includes('@supabase/supabase-js') || id.includes('socket.io-client')) {
            return 'vendor-realtime';
          }

          if (id.includes('@tanstack/react-query')) {
            return 'vendor-query';
          }

          if (id.includes('i18next') || id.includes('react-i18next')) {
            return 'vendor-i18n';
          }

          if (id.includes('@radix-ui') || id.includes('lucide-react')) {
            return 'vendor-ui';
          }

          if (id.includes('/node_modules/react-router-dom/') || id.includes('/node_modules/@remix-run/router/')) {
            return 'vendor-router';
          }

          if (
            id.includes('/node_modules/react/') ||
            id.includes('/node_modules/react-dom/') ||
            id.includes('/node_modules/scheduler/')
          ) {
            return 'vendor-react';
          }

          return 'vendor-misc';
        },
      },
    },
  },
});
});
