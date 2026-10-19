import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Keep the build pipeline intentionally small; this is a client-side portfolio SPA.
export default defineConfig({ plugins: [react()] });
