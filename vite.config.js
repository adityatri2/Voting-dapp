import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['ethers'], // make Vite bundle ethers properly
  },
  build: {
    rollupOptions: {
      external: [], // ensure ethers is not treated as external
    },
  },
});
