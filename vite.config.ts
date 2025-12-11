import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
// @ts-ignore - runtime plugin, types may not be resolved in this TS context
import mkcert from 'vite-plugin-mkcert';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Allow overriding host/port for stable LAN dev
  const env = process.env;
  const PORT = Number(env.VITE_PORT || 5177);
  const DEV_HOST = env.VITE_DEV_HOST || undefined; // e.g., "192.168.1.4" or a hostname
  return ({
  server: {
    host: "0.0.0.0",
    port: PORT,
    strictPort: true,
  // Use trusted HTTPS in dev (mkcert) so getUserMedia works on LAN/IP
  https: true as any,
    hmr: {
      protocol: 'wss',
      host: DEV_HOST, // if undefined, Vite will infer; set explicitly for cross-device HMR over HTTPS
      port: PORT,
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
});
});
