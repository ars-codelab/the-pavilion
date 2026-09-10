import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'The Pavilion',
        short_name: 'Pavilion',
        description: 'Offline cricket management and career simulation',
        theme_color: '#0e1a14',
        background_color: '#0e1a14',
        display: 'standalone',
        start_url: '/',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
    }),
  ],
  optimizeDeps: {
    exclude: ['@pavilion/data'],
  },
  server: {
    port: 5173,
  },
});
