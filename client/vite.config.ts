import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React runtime — changes rarely, long-lived cache hit
          'vendor-react': ['react', 'react-dom'],
          // Recharts + d3 internals — largest dep, cache separately
          'vendor-recharts': ['recharts'],
          // Socket.IO client — separate from UI code
          'vendor-socket': ['socket.io-client'],
        },
      },
    },
  },
});
