import { fileURLToPath } from "node:url";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import vercel from "@astrojs/vercel";
import tailwindcss from "@tailwindcss/vite";
import AstroPWA from "@vite-pwa/astro";
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://legalize-pe.crafter.ing",
  output: "static",
  adapter: vercel({ imageService: "passthrough", isr: { expiration: 86400 } }),
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        // Resolves the bare `id-path-map` specifier to the build-generated JSON.
        // tsc/astro check type-check it via the ambient module in env.d.ts.
        "id-path-map": fileURLToPath(new URL("./public/id-path-map.json", import.meta.url)),
        // Same pattern for the search index: importing it (instead of reading
        // from disk at runtime) bundles it into the serverless function, where
        // `public/` is not on the filesystem. See env.d.ts for the ambient type.
        "search-index": fileURLToPath(new URL("./public/search-index.json", import.meta.url)),
      },
    },
  },
  integrations: [
    react(),
    sitemap(),
    AstroPWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Legalize PE — Peruvian Law as Git",
        short_name: "Legalize PE",
        description:
          "Peruvian legislation as a Git repository. Every law a file, every reform a commit.",
        theme_color: "#fafaf9",
        background_color: "#fafaf9",
        display: "standalone",
        start_url: "/",
        scope: "/",
        icons: [
          { src: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
          {
            src: "/icons/icon-maskable-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        navigateFallback: "/offline",
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: /\.(?:css|js|woff2?|ttf|otf|eot)$/,
            handler: "CacheFirst",
            options: {
              cacheName: "static-assets",
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
            handler: "CacheFirst",
            options: {
              cacheName: "images",
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            urlPattern: /^https:\/\/legalize-pe\.crafter\.ing\/(laws)?$/,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "pages",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
          {
            urlPattern: /^https:\/\/legalize-pe\.crafter\.ing\/laws\/.+$/,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "law-pages",
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
          {
            urlPattern: /^https:\/\/legalize-pe\.crafter\.ing\/api\//,
            handler: "NetworkFirst",
            options: {
              cacheName: "api",
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
              networkTimeoutSeconds: 10,
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
});
