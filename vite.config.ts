/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

// base: на GitHub Pages сайт публикуется по адресу /<repo>/, локально и в single-file
// сборке путь должен оставаться корневым.
const base = process.env.GH_PAGES ? '/Finance/' : '/';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Финансы — учёт финансового здоровья',
        short_name: 'Финансы',
        description:
          'Отслеживание долгов, кредитов, ипотеки, целей, вкладов, инвестиций, доходов и расходов',
        lang: 'ru',
        theme_color: '#0B090A',
        background_color: '#0B090A',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    globals: true,
  },
});
