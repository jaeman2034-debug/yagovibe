# 🔍 VITE_API_BASE 환경 변수 확인 가이드

## 현재 상태

### 환경 변수 파일 (.env.local)
```
VITE_API_BASE_URL=https://asia-northeast3-yago-vibe-spt.cloudfunctions.net
```

### 코드에서 사용 (story.log.ts)
```typescript
const API_BASE = import.meta.env.VITE_API_BASE || "/api";
```

## 문제 발견

### 변수명 불일치
- 환경 변수: `VITE_API_BASE_URL` (URL 포함)
- 코드에서 찾는 변수: `VITE_API_BASE` (URL 없음)
- **결과**: `VITE_API_BASE`는 `undefined` → 기본값 `/api` 사용

## 현재 동작 방식

1. `VITE_API_BASE`가 `undefined`
2. 기본값 `/api` 사용
3. 프록시 설정으로 `/api/logs/story/bulk` → `http://localhost:3001/api/logs/story/bulk` 전달
4. **이론적으로는 작동해야 함**

## 브라우저에서 확인 방법

### 콘솔에서 실행:
```javascript
console.log("VITE_API_BASE:", import.meta.env.VITE_API_BASE);
console.log("VITE_API_BASE_URL:", import.meta.env.VITE_API_BASE_URL);
```

### 예상 결과:
```
VITE_API_BASE: undefined
VITE_API_BASE_URL: "https://asia-northeast3-yago-vibe-spt.cloudfunctions.net"
```

### 실제 사용되는 값:
```javascript
const API_BASE = import.meta.env.VITE_API_BASE || "/api";
// → "/api" (기본값)
```

## 프록시 동작 확인

### Vite 프록시 설정 (vite.config.ts)
```typescript
"/api/logs": {
  target: "http://localhost:3001",
  changeOrigin: true,
  secure: false,
}
```

### 요청 흐름:
1. 프론트: `fetch("/api/logs/story/bulk")`
2. Vite 프록시: `https://localhost:5173/api/logs/story/bulk` → `http://localhost:3001/api/logs/story/bulk`
3. 백엔드: Express 서버에서 요청 수신

## 다음 단계

1. **브라우저 콘솔에서 확인**:
   ```javascript
   console.log(import.meta.env.VITE_API_BASE);
   ```

2. **결과에 따른 대응**:
   - `undefined` → 정상 (기본값 `/api` 사용, 프록시 작동)
   - 다른 값 → 확인 필요

3. **네트워크 탭 확인**:
   - `POST /api/logs/story/bulk` 요청이 있는지
   - 상태 코드: 200 (성공) 또는 404 (프록시 미작동)
