# 🔥 Vite Lazy Import 문제 해결 가이드

## ❌ 현재 문제

**에러:**
```
Failed to fetch dynamically imported module: https://localhost:5173/app/market
```

**원인:**
- Vite + React Router lazy import 구조 문제
- TypeScript 경로 alias 설정 불일치 가능성

---

## ✅ 확인된 설정

### 1. vite.config.ts
- ✅ `base: '/'` 설정됨
- ✅ `alias: { "@": path.resolve(__dirname, "src") }` 설정됨
- ✅ `tsconfigPaths()` 플러그인 사용 중

### 2. App.tsx
- ✅ MarketPage lazy import: `lazy(() => import("./pages/market/MarketPage"))`
- ✅ 상대 경로 사용 (alias 아님)

### 3. tsconfig.json
- ⚠️ 기본 설정만 있고 paths 설정 없음
- ⚠️ `tsconfig.app.json` 확인 필요

---

## 🔧 해결 방법

### 방법 1: TypeScript 경로 설정 확인 (가장 중요)

**tsconfig.app.json에 paths 추가:**

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

### 방법 2: Vite 개발 서버 재시작

```bash
# 1. 개발 서버 종료
Ctrl + C

# 2. node_modules/.vite 캐시 삭제
rm -rf node_modules/.vite

# 3. 개발 서버 재시작
npm run dev
```

### 방법 3: 브라우저 캐시 완전 삭제

1. **개발자 도구 (F12)**
2. **Application 탭**
3. **Storage → Clear site data**
4. **강력 새로고침 (Ctrl + Shift + R)**

### 방법 4: MarketPage 직접 import로 테스트

**임시로 lazy import 제거:**

```typescript
// App.tsx
import MarketPage from "./pages/market/MarketPage"; // lazy 제거

// Route에서
<Route path="/app/market" element={<MarketPage />} />
```

이게 작동하면 → lazy import 문제 확정

---

## 🎯 우선순위 체크리스트

1. ✅ **tsconfig.app.json 확인** (paths 설정)
2. ✅ **Vite 캐시 삭제** (`node_modules/.vite`)
3. ✅ **브라우저 캐시 삭제** (Application → Clear site data)
4. ✅ **개발 서버 재시작** (`npm run dev`)
5. ✅ **Network 탭에서 chunk 파일 확인** (404 여부)

---

## 📝 참고

- Vite는 개발 모드에서 HMR을 사용하므로 캐시 문제가 자주 발생
- TypeScript 경로 alias와 Vite alias는 별도로 설정해야 함
- `tsconfigPaths()` 플러그인이 자동으로 해석하지만, 설정이 없으면 실패할 수 있음
