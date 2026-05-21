# 🔍 디버깅 정보 요약

## 1️⃣ vite.config.ts 전체

```typescript
import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import fs from "fs";
import { fileURLToPath } from "url";
import mkcert from "vite-plugin-mkcert";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
  const isDev = mode === "development";
  
  return {
    // 🔥 명시적 base 경로 설정
    base: '/',
    
    plugins: [
      react(),
      tsconfigPaths(), // TypeScript paths 자동 해석
      mkcert(), // HTTPS 개발 서버
    ],
    
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
        "react-native": path.resolve(__dirname, "src/utils/react-native-stub.ts"),
        "react-native-maps": path.resolve(__dirname, "src/utils/react-native-maps-stub.ts"),
      },
    },
    
    server: {
      host: true,
      port: 5173,
      strictPort: true,
      https: true, // HTTPS 사용
      watch: {
        usePolling: true,
      },
      hmr: {
        protocol: "wss", // HTTPS 환경에서 WebSocket도 WSS 사용
      },
      proxy: {
        "/api/admin": {
          target: isDev ? "http://localhost:3001" : "http://localhost:3001",
          changeOrigin: true,
          secure: false,
        },
        "/api/logs": {
          target: isDev ? "http://localhost:3001" : "http://localhost:3001",
          changeOrigin: true,
          secure: false,
        },
      },
    },
    
    build: {
      target: "es2022",
      sourcemap: false,
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, "index.html"),
        },
        output: {
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]',
          manualChunks: undefined,
        },
      },
      chunkSizeWarningLimit: 1000,
    },
  };
});
```

**핵심 설정:**
- ✅ `base: '/'` - 루트 경로
- ✅ `tsconfigPaths()` - TypeScript paths 자동 해석
- ✅ `alias: { "@": "src" }` - 경로 alias
- ✅ `https: true` - HTTPS 개발 서버
- ✅ `chunkFileNames: 'assets/[name]-[hash].js'` - chunk 파일명 형식

---

## 2️⃣ App.tsx 라우터 부분 (MarketPage 관련)

### MarketPage Lazy Import

```typescript
// src/App.tsx (235-240줄)
const MarketPage = lazy(() =>
  import("./pages/market/MarketPage").catch((err) => {
    // 상세 에러 로그 출력 (디버깅 필요)
    console.error("❌ [App] MarketPage 동적 import 실패:", err);
    console.error("❌ [App] MarketPage 에러 상세:", {
      message: err?.message,
      name: err?.name,
    });
    // Fallback 컴포넌트 반환
    return {
      default: () => <FallbackPage pageName="마켓" />
    };
  })
);
```

### MarketPage Route 설정

```typescript
// src/App.tsx (1554-1557줄)
<Route path="/app/market" element={<MarketLayout />}>
  <Route index element={<MarketPage />} />
  <Route path="map" element={<MapPage />} />
  <Route path=":id" element={<ProductDetail />} />
</Route>
```

**라우트 구조:**
- `/app/market` → `MarketLayout` (레이아웃)
  - `/app/market` (index) → `MarketPage` (lazy)
  - `/app/market/map` → `MapPage` (lazy)
  - `/app/market/:id` → `ProductDetail` (lazy)

---

## 3️⃣ Network 탭 확인 방법

### 확인해야 할 정보

1. **F12 → Network 탭 열기**
2. **JS 파일 필터 선택**
3. **페이지 새로고침 (Ctrl + Shift + R)**
4. **다음 파일들 확인:**

#### A. Main Entry 파일
- `index-[hash].js` 또는 `main-[hash].js`
- 상태: 200 OK ✅ / 404 ❌
- 크기: 보통 100KB 이상

#### B. MarketPage Chunk 파일
- `MarketPage-[hash].js` 또는 `chunk-[hash].js`
- 상태: 200 OK ✅ / 404 ❌
- 크기: 보통 50KB 이상

#### C. 기타 Chunk 파일
- `chunk-[hash].js` (여러 개)
- 상태: 모두 200 OK ✅

### 확인 포인트

**정상:**
```
✅ index-abc123.js    200 OK    150KB
✅ MarketPage-def456.js  200 OK    80KB
✅ chunk-ghi789.js    200 OK    30KB
```

**문제:**
```
❌ MarketPage-def456.js  404 Not Found
❌ chunk-ghi789.js    404 Not Found
❌ Failed to fetch dynamically imported module
```

### Network 탭 스크린샷 요청 사항

1. **JS 파일 필터 적용된 화면**
2. **MarketPage 관련 파일 (빨간색 404 표시)**
3. **에러 메시지 (Failed to fetch)**
4. **Request URL (전체 경로)**

---

## 🔧 예상 문제 시나리오

### 시나리오 1: Chunk 파일 404

**증상:**
```
MarketPage-abc123.js  404 Not Found
```

**원인:**
- Vite 캐시 문제
- 빌드 경로 불일치

**해결:**
```bash
# Vite 캐시 삭제
Remove-Item -Recurse -Force node_modules\.vite

# 개발 서버 재시작
npm run dev
```

### 시나리오 2: CORS 에러

**증상:**
```
CORS policy: No 'Access-Control-Allow-Origin' header
```

**원인:**
- HTTPS/HTTP 혼용
- Vite 서버 설정 문제

**해결:**
- `vite.config.ts`의 `server.https` 설정 확인
- 브라우저에서 `https://localhost:5173` 접속 확인

### 시나리오 3: 타임아웃

**증상:**
```
Failed to fetch: timeout
```

**원인:**
- 네트워크 문제
- Vite 서버 응답 지연

**해결:**
- Vite 서버 로그 확인
- 포트 5173 충돌 확인

---

## 📝 다음 단계

1. **Network 탭 스크린샷 제공**
   - JS 파일 필터 적용
   - MarketPage 관련 파일 표시
   - 에러 메시지 포함

2. **콘솔 에러 전체 복사**
   - `Failed to fetch dynamically imported module` 에러
   - 전체 스택 트레이스

3. **Vite 서버 로그 확인**
   - `npm run dev` 실행 시 출력되는 로그
   - chunk 파일 생성 메시지

---

## 💡 빠른 체크리스트

- [ ] Network 탭에서 JS 파일 필터 적용
- [ ] MarketPage 관련 chunk 파일 확인
- [ ] 404 에러 여부 확인
- [ ] Request URL 전체 경로 확인
- [ ] 콘솔 에러 메시지 복사
- [ ] Vite 서버 로그 확인
