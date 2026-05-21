# 🔥 Vite Base Path 문제 해결 가이드

## ✅ 확인된 설정

### 1. vite.config.ts
```typescript
base: '/', // ✅ 루트 경로 (정상)
```

### 2. main.tsx
```typescript
<BrowserRouter> // ✅ basename 없음 (정상)
```

### 3. App.tsx
```typescript
<Route path="/app/market" element={<MarketLayout />}>
  <Route index element={<MarketPage />} />
</Route>
```

---

## 🔴 문제 원인

**현재 상황:**
- Vite `base: '/'` 설정
- 라우트는 `/app/market` 경로 사용
- 사용자가 `localhost:5173/app/market`으로 접속
- **하지만 lazy import는 상대 경로로 해석되어 잘못된 경로를 찾음**

**에러:**
```
Failed to fetch dynamically imported module: https://localhost:5173/...
```

---

## ✅ 해결 방법 (2가지 옵션)

### 옵션 1: 개발 환경에서 루트 경로 사용 (권장)

**접속 URL 변경:**
```
❌ localhost:5173/app/market
✅ localhost:5173/market
```

**라우트 경로 수정:**
```typescript
// App.tsx
<Route path="/market" element={<MarketLayout />}>
  <Route index element={<MarketPage />} />
</Route>
```

---

### 옵션 2: 개발/프로덕션 분리 (더 안전)

**vite.config.ts 수정:**
```typescript
export default defineConfig(({ mode }) => {
  const isDev = mode === "development";
  
  return {
    // 🔥 개발 환경: 루트, 프로덕션: /app/
    base: isDev ? '/' : '/app/',
    // ... 나머지 설정
  };
});
```

**main.tsx 수정:**
```typescript
<BrowserRouter basename={import.meta.env.PROD ? "/app" : "/"}>
  <AuthProvider>
    <App />
  </AuthProvider>
</BrowserRouter>
```

---

## 🚀 즉시 해결 (가장 빠름)

### 1단계: Vite 캐시 삭제

```powershell
# Vite 캐시 삭제
Remove-Item -Recurse -Force node_modules\.vite -ErrorAction SilentlyContinue

# 개발 서버 재시작
npm run dev
```

### 2단계: 올바른 URL로 접속

```
✅ http://localhost:5173/market
❌ http://localhost:5173/app/market
```

### 3단계: 브라우저 캐시 삭제

1. **F12 → Application → Storage → Clear site data**
2. **강력 새로고침 (Ctrl + Shift + R)**

---

## 📝 현재 접속 URL 확인 필요

**질문:**
- 현재 어떤 URL로 접속하고 계신가요?
  - `localhost:5173/app/market` ❌
  - `localhost:5173/market` ✅

**확인 방법:**
- 브라우저 주소창의 전체 URL 확인
- Network 탭에서 Request URL 확인

---

## 💡 추천 해결 루트

**가장 빠른 방법:**
1. **접속 URL을 `localhost:5173/market`으로 변경**
2. **Vite 캐시 삭제 + 서버 재시작**
3. **브라우저 캐시 삭제**

이렇게 하면 99% 해결됩니다!
