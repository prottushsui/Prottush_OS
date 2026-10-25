import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Keep the SPA build small and separate stable vendor code from the app shell.
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replaceAll(String.fromCharCode(92), '/');
          if (normalizedId.includes('/node_modules/lucide-react/')) return 'icons-vendor';
          if (
            normalizedId.includes('/node_modules/react/') ||
            normalizedId.includes('/node_modules/react-dom/') ||
            normalizedId.includes('/node_modules/scheduler/')
          ) return 'react-vendor';
        },
      },
    },
  },
});
