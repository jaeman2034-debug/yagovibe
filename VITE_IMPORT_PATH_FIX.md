# 🔥 Vite Lazy Import 경로 문제 완전 해결 가이드

## ✅ 확인된 파일 구조

### 실제 파일 위치
- ✅ `src/components/map/MapPageContainer.tsx` (존재)
- ✅ `src/pages/market/MapPage.tsx` (존재)
- ✅ `src/pages/market/MarketPage.tsx` (존재)

### 현재 import 경로
- ❌ `./components/map/MapPageContainer` (상대 경로)
- ❌ `./pages/market/MapPage` (상대 경로)
- ❌ `./pages/market/MarketPage` (상대 경로)

### 에러 메시지
```
Failed to fetch dynamically imported module
https://localhost:5173/src/components/map/MapPageContainer.tsx
```

**문제:**
- 상대 경로가 절대 경로로 잘못 해석됨
- Vite가 `/src/...` 경로로 직접 요청
- 파일을 찾지 못함

---

## ✅ 해결 방법

### 옵션 1: Alias 경로로 변경 (권장)

**변경 전:**
```typescript
const MapPageContainer = lazy(() => import("./components/map/MapPageContainer"));
const MapPage = lazy(() => import("./pages/market/MapPage"));
const MarketPage = lazy(() => import("./pages/market/MarketPage"));
```

**변경 후:**
```typescript
const MapPageContainer = lazy(() => import("@/components/map/MapPageContainer"));
const MapPage = lazy(() => import("@/pages/market/MapPage"));
const MarketPage = lazy(() => import("@/pages/market/MarketPage"));
```

**장점:**
- Vite alias가 정확히 해석됨
- 경로 문제 없음
- 일관성 유지

---

### 옵션 2: Vite 캐시 삭제 (임시 해결)

```powershell
Remove-Item -Recurse -Force node_modules\.vite -ErrorAction SilentlyContinue
npm run dev
```

**단점:**
- 근본 원인 해결 안 됨
- 재발 가능성 있음

---

## 🚀 최종 해결책 (권장)

### 1단계: MapPageContainer import 수정 (완료)
```typescript
// ✅ 수정 완료
const MapPageContainer = lazy(() => import("@/components/map/MapPageContainer"));
```

### 2단계: 다른 상대 경로도 확인 필요

**확인해야 할 lazy import:**
- `MapPage` (중고거래 상품 지도)
- `MarketPage` (마켓 페이지)
- 기타 상대 경로 사용하는 lazy import

### 3단계: Vite 캐시 삭제
```powershell
Remove-Item -Recurse -Force node_modules\.vite -ErrorAction SilentlyContinue
```

### 4단계: 개발 서버 재시작
```powershell
npm run dev
```

### 5단계: 브라우저 캐시 삭제
- F12 → Application → Storage → Clear site data
- 강력 새로고침 (Ctrl + Shift + R)

---

## 📝 참고

### 왜 상대 경로가 문제가 되나?

**정상 동작:**
- 상대 경로: `./components/map/MapPageContainer`
- Vite 해석: `src/components/map/MapPageContainer.tsx` ✅

**문제 발생:**
- 상대 경로: `./components/map/MapPageContainer`
- Vite 해석: `/src/components/map/MapPageContainer.tsx` ❌
- 브라우저 요청: `https://localhost:5173/src/...` ❌

**해결:**
- Alias 경로: `@/components/map/MapPageContainer`
- Vite 해석: `src/components/map/MapPageContainer.tsx` ✅
- 브라우저 요청: 정상 chunk 파일 ✅

---

## ✅ 체크리스트

- [x] MapPageContainer import 경로 수정 완료
- [ ] MapPage import 경로 확인
- [ ] MarketPage import 경로 확인
- [ ] Vite 캐시 삭제
- [ ] 개발 서버 재시작
- [ ] 브라우저 캐시 삭제
- [ ] 테스트: `/map`, `/market` 접속
