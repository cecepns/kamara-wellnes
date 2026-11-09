import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  plugins: [react(), VitePWA({ registerType: 'autoUpdate', manifest: {
    name: 'Kamara Wellness', short_name: 'Kamara', theme_color: '#ae9142', background_color: '#f7f5f0', display: 'standalone',
    icons: [{ src: '/logo.png', sizes: '512x512', type: 'image/png', purpose: 'any' }] } })],
});
