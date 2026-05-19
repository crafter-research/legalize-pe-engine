import sitemap from '@astrojs/sitemap'
import vercel from '@astrojs/vercel'
import AstroPWA from '@vite-pwa/astro'
import { defineConfig } from 'astro/config'

export default defineConfig({
  site: 'https://legalize.crafter.ing',
  output: 'static',
  adapter: vercel({ imageService: 'passthrough' }),
  integrations: [
    sitemap(),
    AstroPWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Legalize PE - Legislación Peruana',
        short_name: 'Legalize PE',
        description:
          'Legislación peruana como repositorio Git. Cada ley es un fichero Markdown, cada reforma un commit.',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/icons/icon-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        navigateFallback: '/offline',
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            // CSS, JS, fonts - Cache-first
            urlPattern: /\.(?:css|js|woff2?|ttf|otf|eot)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'static-assets',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
          {
            // Images - Cache-first
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
          {
            // Homepage and main pages - Stale-while-revalidate
            urlPattern: /^https:\/\/legalize\.crafter\.ing\/(leyes)?$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'pages',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
              },
            },
          },
          {
            // Individual law pages - Stale-while-revalidate with limit
            urlPattern: /^https:\/\/legalize\.crafter\.ing\/leyes\/.+$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'law-pages',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
              },
            },
          },
          {
            // API responses - Network-first with fallback
            urlPattern: /^https:\/\/legalize\.crafter\.ing\/api\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24, // 1 day
              },
              networkTimeoutSeconds: 10,
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
})
