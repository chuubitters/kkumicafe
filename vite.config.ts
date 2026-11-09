import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base so the build works on Vercel, GitHub Pages or any sub-path.
export default defineConfig({
  plugins: [react()],
  base: './',
  build: { outDir: 'dist', chunkSizeWarningLimit: 1200 },
});
