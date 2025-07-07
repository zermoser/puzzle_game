import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/puzzle_game/',
  server: {
    open: true,
    port: 3015
  }
});
