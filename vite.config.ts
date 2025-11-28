import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { VitePWA } from "vite-plugin-pwa";
import fs from "fs";
import { fileURLToPath } from "url";

// 🔥 .env.production 파일에서 Google Maps API 키 직접 읽기
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envProductionPath = path.join(__dirname, ".env.production");

// 우선순위: 1) 환경변수 2) .env.production 파일 3) .env.local 파일
let googleMapsApiKey = process.env.VITE_GOOGLE_MAPS_API_KEY || "";

// .env.production 파일에서 읽기
if (!googleMapsApiKey && fs.existsSync(envProductionPath)) {
  try {
    const envContent = fs.readFileSync(envProductionPath, "utf-8");
    const envLines = envContent.split("\n");
    
    for (const line of envLines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const match = trimmed.match(/^VITE_GOOGLE_MAPS_API_KEY=(.*)$/);
        if (match && match[1]) {
          googleMapsApiKey = match[1].trim();
          console.log(`✅ [vite.config.ts] .env.production에서 API 키 로드: ${googleMapsApiKey.substring(0, 10)}...`);
          break;
        }
      }
    }
  } catch (error) {
    console.error("❌ [vite.config.ts] .env.production 파일 읽기 실패:", error);
  }
}

// .env.local 파일에서 읽기 (fallback)
if (!googleMapsApiKey) {
  const envLocalPath = path.join(__dirname, ".env.local");
  if (fs.existsSync(envLocalPath)) {
    try {
      const envContent = fs.readFileSync(envLocalPath, "utf-8");
      const envLines = envContent.split("\n");
      
      for (const line of envLines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#")) {
          const match = trimmed.match(/^VITE_GOOGLE_MAPS_API_KEY=(.*)$/);
          if (match && match[1]) {
            googleMapsApiKey = match[1].trim();
            console.log(`✅ [vite.config.ts] .env.local에서 API 키 로드: ${googleMapsApiKey.substring(0, 10)}...`);
            break;
          }
        }
      }
    } catch (error) {
      console.error("❌ [vite.config.ts] .env.local 파일 읽기 실패:", error);
    }
  }
}

if (!googleMapsApiKey) {
  console.warn("⚠️ [vite.config.ts] Google Maps API 키를 찾을 수 없습니다!");
  console.warn("   .env.production 또는 .env.local 파일에 VITE_GOOGLE_MAPS_API_KEY를 설정하세요.");
} else {
  console.log(`✅ [vite.config.ts] Google Maps API 키 설정 완료 (${googleMapsApiKey.length}자)`);
}

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
          // Firebase Storage 다운로드 (GET만) → 캐시 우선
          // 🔥 업로드 요청 (POST/PUT/PATCH)은 절대 캐싱하지 않음
          {
            urlPattern: ({ url, request }) => {
              // Firebase Storage이고 GET 요청만 캐싱
              if (url.origin.includes("firebasestorage.googleapis.com")) {
                // 업로드 관련 경로나 POST/PUT/PATCH 요청은 제외
                if (
                  request.method !== "GET" ||
                  url.pathname.includes("upload") ||
                  url.searchParams.has("uploadType")
                ) {
                  return false; // 캐싱하지 않음
                }
                return true; // GET 요청만 캐싱
              }
              return false;
            },
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
        enabled: false, // 🔥 Service Worker 강제 비활성화 (업로드 문제 해결)
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
    include: [
      "@sentry/react",
      "react-is",
      "recharts",
      // 🔥 Firebase SDK 명시적 포함 (배포 환경에서 로드 보장)
      "firebase/app",
      "firebase/auth",
      "firebase/firestore",
      "firebase/storage",
    ],
  },
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    hmr: {
      overlay: false,
      clientPort: 5173,
    },
    // 🔥 SPA 라우팅을 위한 historyApiFallback 설정
    // 모든 경로를 index.html로 리다이렉트하여 React Router가 처리하도록 함
    // Firebase Auth의 /__/auth/handler 경로도 처리됨
    fs: {
      allow: [".."],
    },
    proxy: {
      "/nlu": {
        target: process.env.VITE_FUNCTIONS_ORIGIN || process.env.VITE_API_BASE_URL || "https://asia-northeast3-yago-vibe-spt.cloudfunctions.net",
        changeOrigin: true,
        secure: true,
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
  // 🔥 빌드 시점 환경 변수 주입 (Google Maps API Key)
  // .env.production 파일에서 직접 읽은 값을 사용
  define: {
    'import.meta.env.VITE_GOOGLE_MAPS_API_KEY': JSON.stringify(googleMapsApiKey),
  },
});
