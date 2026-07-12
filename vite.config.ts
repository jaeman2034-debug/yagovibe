import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
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
  // vite-plugin-pwa(VitePWA) 비활성화 — 빌드 시 SW/workbox 주입 없음. manifest는 public/manifest.json 사용.
  plugins: [react(), tsconfigPaths()],
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
    // IPv4 loopback — Windows에서 host:true(::) 바인딩 시 127.0.0.1 요청이 먹통되는 케이스 회피
    host: "127.0.0.1",
    port: 5173,
    // 5173 점유 시(이전 dev 프로세스 등) 다음 포트로 기동 — 고정 clientPort는 포트 불일치로 HMR 깨짐 유발
    strictPort: false,
    hmr: {
      overlay: false,
    },
    // data/·artifact 대량 파일 워치가 이벤트 루프를 잡아 HTTP가 멈춘 것처럼 보이는 현상 완화
    watch: {
      ignored: [
        "**/data/**",
        "**/dist/**",
        "**/coverage/**",
        "**/.git/**",
        "**/functions/lib/**",
        "**/android/**",
        "**/ios/**",
      ],
    },
    // 🔥 SPA 라우팅을 위한 historyApiFallback 설정
    // 모든 경로를 index.html로 리다이렉트하여 React Router가 처리하도록 함
    // Firebase Auth의 /__/auth/handler 경로도 처리됨
    fs: {
      allow: [path.resolve(__dirname)],
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
