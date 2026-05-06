import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const apiProxy = {
  '/api': {
    target: 'http://localhost:3001',
    changeOrigin: true,
  },
};

export default defineConfig({
  plugins: [react()],
  server: {
    // Listen on IPv4 + IPv6; default [::1]-only breaks http://127.0.0.1:5173 on some Windows setups
    host: true,
    port: 5173,
    proxy: apiProxy,
  },
  preview: {
    host: true,
    proxy: apiProxy,
  },
});
