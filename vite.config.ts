import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "favicon.ico",
        "apple-touch-icon.png",
        "pwa-192x192.png",
        "pwa-512x512.png",
      ],
      manifest: {
        name: "YAGO VIBE",
        short_name: "YAGO VIBE",
        description: "AI Sports Market & Map Platform",
        theme_color: "#ffffff",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        lang: "ko",
        categories: ["shopping", "sports", "productivity"],
        icons: [
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
        shortcuts: [
          {
            name: "스포츠 마켓",
            short_name: "마켓",
            description: "스포츠 용품 스마트 마켓 열기",
            url: "/app/market",
            icons: [{ src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" }],
          },
          {
            name: "AI 지도",
            short_name: "지도",
            description: "AI 기반 스포츠 시설 지도 열기",
            url: "/voice-map",
            icons: [{ src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" }],
          },
          {
            name: "AI 리포트",
            short_name: "리포트",
            description: "AI 자동 리포트 대시보드 열기",
            url: "/app/admin/reports",
            icons: [{ src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" }],
          },
        ],
      },
      workbox: {
        navigateFallback: "/index.html",
        runtimeCaching: [
          // API (Firebase Functions 등) → 항상 네트워크 우선
          {
            urlPattern: ({ url }) => url.origin.includes("cloudfunctions.net"),
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              networkTimeoutSeconds: 10,
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // Firestore/Storage / 이미지 등 → 캐시 우선
          {
            urlPattern: ({ url }) =>
              url.origin.includes("firebasestorage.googleapis.com"),
            handler: "CacheFirst",
            options: {
              cacheName: "image-cache",
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 7 * 24 * 60 * 60, // 7일
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // 구글 지도 JS/CSS → 캐시 우선 + 만료
          {
            urlPattern: ({ url }) =>
              url.origin.includes("maps.googleapis.com") ||
              url.origin.includes("maps.gstatic.com"),
            handler: "CacheFirst",
            options: {
              cacheName: "google-maps-cache",
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 7 * 24 * 60 * 60,
              },
            },
          },
          // 앱 JS/CSS 정적 리소스
          {
            urlPattern: ({ request }) =>
              request.destination === "script" ||
              request.destination === "style" ||
              request.destination === "font",
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "static-resources",
            },
          },
        ],
      },
      devOptions: {
        enabled: true, // dev에서도 PWA 테스트 가능
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  css: {
    postcss: "./postcss.config.js",
  },
  optimizeDeps: {
    include: ["@sentry/react", "react-is", "recharts"],
  },
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    hmr: {
      overlay: false,
      clientPort: 5173,
    },
    // SPA 라우팅을 위한 fallback 설정
    // 모든 경로를 index.html로 리다이렉트하여 React Router가 처리하도록 함
    fs: {
      allow: [".."],
    },
    proxy: {
      "/nlu": {
        target: "http://localhost:5183",
        changeOrigin: true,
        secure: false,
        rewrite: (p) => p.replace(/^\/nlu/, "/nlu"),
      },
    },
  },
  // SPA 라우팅을 위한 빌드 설정
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "index.html"),
      },
    },
  },
});
