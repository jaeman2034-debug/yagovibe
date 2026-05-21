# 🔥 Firebase Hosting 배포 체크리스트

## ✅ 현재 상태 (2024년 기준)

### 1. 핵심 설정 확인

#### ✅ firebase.json
```json
{
  "hosting": {
    "public": "dist",
    "rewrites": [
      { "source": "**", "destination": "/index.html" }
    ]
  }
}
```
**상태:** ✅ 정상 (이미 올바르게 설정됨)

#### ✅ vite.config.ts
```typescript
export default defineConfig({
  base: '/', // ✅ 루트 경로
})
```
**상태:** ✅ 정상

#### ✅ main.tsx (React Router)
```typescript
<BrowserRouter>
  {/* basename 없음 ✅ */}
</BrowserRouter>
```
**상태:** ✅ 정상 (basename 제거 완료)

---

## 🎯 배포 전 필수 체크리스트

### 1단계: 빌드 확인

```bash
# 프로덕션 빌드 실행
npm run build

# 빌드 결과 확인
ls -la dist/
```

**확인 사항:**
- ✅ `dist/index.html` 존재
- ✅ `dist/assets/` 폴더에 JS/CSS 파일 생성됨
- ✅ 빌드 에러 없음

---

### 2단계: 로컬 프리뷰 테스트

```bash
# Vite 프리뷰 서버 실행
npm run preview

# 또는 Firebase Emulator 사용
firebase emulators:start --only hosting
```

**테스트 URL:**
```
http://localhost:4173/
http://localhost:4173/map
http://localhost:4173/market
http://localhost:4173/admin/dashboard
```

**확인 사항:**
- ✅ 모든 페이지 정상 로드
- ✅ 새로고침 시 404 없음
- ✅ lazy import 정상 작동
- ✅ 동적 라우팅 정상 작동

---

### 3단계: 환경 변수 확인

```bash
# 환경 변수 체크
npm run check:env
```

**필수 환경 변수:**
- ✅ `VITE_FIREBASE_API_KEY`
- ✅ `VITE_FIREBASE_AUTH_DOMAIN`
- ✅ `VITE_FIREBASE_PROJECT_ID`
- ✅ `VITE_GOOGLE_MAPS_API_KEY`
- ✅ 기타 필요한 환경 변수들

---

### 4단계: Service Worker 확인

**현재 상태:** ✅ 완전히 비활성화됨

**확인 위치:**
- `src/main.tsx`: Service Worker 강제 해제 로직 ✅
- `index.html`: Service Worker 제거 스크립트 ✅
- `vite.config.ts`: VitePWA 플러그인 제거됨 ✅

**배포 후 확인:**
- 브라우저 DevTools → Application → Service Workers
- 등록된 Service Worker 없어야 함 ✅

---

## 🚀 배포 명령어

### 전체 배포 (Hosting + Functions)
```bash
npm run deploy
```

### Hosting만 배포
```bash
npm run deploy:hosting
```

### Functions만 배포
```bash
npm run deploy:functions
```

### Firestore Rules 배포
```bash
npm run deploy:rules
```

---

## 📋 배포 후 자동 테스트 목록

### 1. 기본 페이지 접근 테스트

```bash
# 배포 후 자동 테스트 스크립트 (선택사항)
```

**테스트 URL:**
```
✅ https://yago-vibe.web.app/
✅ https://yago-vibe.web.app/map
✅ https://yago-vibe.web.app/market
✅ https://yago-vibe.web.app/admin/dashboard
✅ https://yago-vibe.web.app/sports-hub
```

**확인 사항:**
- ✅ 모든 페이지 정상 로드
- ✅ 404 에러 없음
- ✅ 콘솔 에러 없음

---

### 2. 새로고침 테스트

**각 페이지에서:**
1. 페이지 접속
2. `F5` 또는 `Ctrl+R` 새로고침
3. `Ctrl+Shift+R` 강력 새로고침

**확인 사항:**
- ✅ 새로고침 후에도 정상 로드
- ✅ 404 에러 없음
- ✅ 라우팅 정상 작동

---

### 3. 동적 라우팅 테스트

**테스트 경로:**
```
✅ /sports/football
✅ /sports/badminton
✅ /team/:id
✅ /market/:id
✅ /app/team/:id
```

**확인 사항:**
- ✅ 동적 파라미터 정상 파싱
- ✅ 페이지 정상 렌더링
- ✅ 새로고침 시에도 정상 작동

---

### 4. Lazy Loading 테스트

**확인 방법:**
1. 브라우저 DevTools → Network 탭
2. 페이지 접속
3. 다른 페이지로 이동

**확인 사항:**
- ✅ chunk 파일 정상 로드
- ✅ `Failed to fetch dynamically imported module` 에러 없음
- ✅ 코드 스플리팅 정상 작동

---

### 5. 캐시 테스트

**확인 방법:**
1. 브라우저 DevTools → Network 탭
2. "Disable cache" 체크 해제
3. 페이지 접속 후 새로고침

**확인 사항:**
- ✅ `index.html`은 `no-cache` 헤더 (firebase.json 설정)
- ✅ JS/CSS 파일은 `max-age=31536000` 캐싱
- ✅ 새 버전 배포 시 자동 업데이트

---

## ⚠️ 주의사항

### 1. Service Worker 충돌 방지

**현재 상태:** ✅ 완전히 비활성화됨

**배포 후 확인:**
- 브라우저 DevTools → Application → Service Workers
- 등록된 Service Worker 없어야 함
- 만약 있다면:
  1. `index.html`의 Service Worker 제거 스크립트 확인
  2. `src/main.tsx`의 강제 해제 로직 확인
  3. 수동으로 브라우저 캐시 삭제

---

### 2. 환경 변수 주입 확인

**빌드 시점:**
- `.env.production` 파일에서 환경 변수 읽기
- `vite.config.ts`의 `define` 옵션으로 주입

**배포 후 확인:**
- 브라우저 콘솔에서 환경 변수 확인
- Firebase 연결 정상 작동 확인

---

### 3. Firebase Functions 연동

**확인 사항:**
- ✅ Functions 배포 완료
- ✅ CORS 설정 정상
- ✅ API 프록시 정상 작동

---

## 🔧 문제 해결 가이드

### 문제 1: 새로고침 시 404 에러

**원인:**
- `firebase.json`의 `rewrites` 설정 누락

**해결:**
```json
{
  "hosting": {
    "rewrites": [
      { "source": "**", "destination": "/index.html" }
    ]
  }
}
```

**현재 상태:** ✅ 이미 설정됨

---

### 문제 2: Dynamic Import 실패

**원인:**
- `vite.config.ts`의 `base` 설정 오류
- `BrowserRouter`의 `basename` 설정 오류

**해결:**
- ✅ `base: '/'` 설정 확인
- ✅ `basename` 제거 확인

**현재 상태:** ✅ 이미 수정됨

---

### 문제 3: 캐시 문제

**원인:**
- 이전 버전의 Service Worker 캐싱
- 브라우저 캐시

**해결:**
1. Service Worker 완전 제거 (이미 완료 ✅)
2. `firebase.json`의 캐시 헤더 설정 확인
3. 사용자에게 강력 새로고침 안내

---

## 📊 배포 후 모니터링

### 1. Firebase Console 확인

**확인 위치:**
- Firebase Console → Hosting
- 배포 이력 확인
- 트래픽 통계 확인

---

### 2. 에러 모니터링

**확인 위치:**
- Firebase Console → Crashlytics (설정된 경우)
- Sentry (설정된 경우)
- 브라우저 콘솔 에러 로그

---

### 3. 성능 모니터링

**확인 항목:**
- 페이지 로드 시간
- First Contentful Paint (FCP)
- Largest Contentful Paint (LCP)
- Time to Interactive (TTI)

---

## ✅ 최종 체크리스트

배포 전:
- [ ] `npm run build` 성공
- [ ] `npm run preview` 테스트 통과
- [ ] 환경 변수 확인 완료
- [ ] Service Worker 비활성화 확인
- [ ] `firebase.json` 설정 확인

배포 후:
- [ ] 모든 페이지 접근 테스트 통과
- [ ] 새로고침 테스트 통과
- [ ] 동적 라우팅 테스트 통과
- [ ] Lazy Loading 테스트 통과
- [ ] 캐시 동작 확인
- [ ] 콘솔 에러 없음 확인

---

## 🎯 결론

**현재 구조는 Firebase Hosting 표준 구조와 100% 일치합니다.**

✅ `base: '/'` 설정
✅ `basename` 제거
✅ `rewrites` 설정 완료
✅ Service Worker 비활성화
✅ 캐시 헤더 설정 완료

**배포 준비 완료 상태입니다!** 🚀
