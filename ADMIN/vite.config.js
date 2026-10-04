import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import babel from '@rolldown/plugin-babel';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
  // The client app uses 5173; the admin panel always runs on 5174 locally.
  server: { port: 5174, strictPort: true },
  preview: { port: 5174, strictPort: true },
  // Don't publish source maps for the admin panel.
  build: { sourcemap: false },
});
