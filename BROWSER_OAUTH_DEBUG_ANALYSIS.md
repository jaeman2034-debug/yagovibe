# 🔍 브라우저별 OAuth 충돌 자동 점검 결과

## 📋 코드베이스 분석 결과

### 1. Firebase 초기화 분석

**파일**: `src/lib/firebase.ts`

**현재 설정**:
```typescript
const firebaseConfig = {
  apiKey: envVars.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "yago-vibe-spt.firebaseapp.com",
  projectId: "yago-vibe-spt",
  storageBucket: "yago-vibe-spt.firebasestorage.app",
  messagingSenderId: envVars.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: envVars.VITE_FIREBASE_APP_ID || "",
};
```

**주요 발견사항**:
- ✅ `authDomain`은 환경 변수 또는 기본값 사용
- ✅ 모든 환경에서 `yago-vibe-spt.firebaseapp.com` 사용
- ⚠️ `.env.local` 파일이 코드베이스에 없음 (환경 변수 확인 필요)

### 2. Google OAuth 사용 방식

**파일**: `src/pages/LoginPage.tsx`, `src/pages/SignupPage.tsx`

**현재 구현**:
- ✅ `signInWithRedirect` 사용 (팝업 방식에서 변경됨)
- ✅ `GoogleAuthProvider` 매번 새로 생성
- ✅ 중복 호출 방지 로직 (`isSigningInRef`, `googleLoading`)

**Redirect 결과 처리**: `src/App.tsx`에서 `getRedirectResult` 처리

### 3. 브라우저별 로직

**파일**: `src/App.tsx`

**WebView 감지 로직**:
- ✅ User Agent 기반 감지
- ✅ Window 크기 기반 감지
- ✅ 저장소 접근 제한 감지
- ⚠️ localhost에서는 WebView 감지 비활성화

**Service Worker**: VitePWA 플러그인 사용 (Workbox)

## 🔍 브라우저별 비교 분석

### Chrome vs Edge 비교표

| 항목 | Chrome | Edge | 차이점 |
|------|--------|------|--------|
| **Origin** | `http://localhost:5173` | `http://localhost:5173` | 동일 |
| **Redirect URL** | `https://yago-vibe-spt.firebaseapp.com/_/auth/handler` | `https://yago-vibe-spt.firebaseapp.com/_/auth/handler` | 동일 |
| **Referer Header** | `http://localhost:5173/login` | `http://localhost:5173/login` | 동일 |
| **Service Worker** | Workbox (VitePWA) | Workbox (VitePWA) | 동일 |
| **Third-party Cookies** | 기본 허용 | 기본 허용 | 동일 |
| **Popup Blocking** | 기본 허용 | 기본 허용 | 동일 |
| **ITP Restrictions** | 없음 | 없음 | 동일 |

**결론**: Chrome과 Edge는 동일한 동작을 해야 합니다.

### 실제 사용되는 Origin 및 Redirect URL

#### 로컬 개발 환경
- **Origin**: `http://localhost:5173`
- **Redirect URL**: `https://yago-vibe-spt.firebaseapp.com/_/auth/handler?apiKey=...&redirectUrl=http://localhost:5173/login`

#### 프로덕션 환경
- **Origin**: `https://yago-vibe-spt.firebaseapp.com`, `https://yagovibe.com`, `https://www.yagovibe.com`
- **Redirect URL**: `https://yago-vibe-spt.firebaseapp.com/_/auth/handler?apiKey=...&redirectUrl={원래_페이지}`

## 🎯 브라우저별 오류 원인 분석

### Chrome에서 발생 가능한 오류

1. **`auth/requests-from-referer-are-blocked`**
   - **원인**: Google Cloud Console의 "승인된 JavaScript 원본"에 `localhost:5173` 누락
   - **확인**: Google Cloud Console → OAuth 2.0 클라이언트 ID → 승인된 JavaScript 원본

2. **`The requested action is invalid`**
   - **원인**: 
     - Referer mismatch (로컬 개발 환경)
     - Service Worker 캐시 문제
     - 브라우저 캐시 문제
   - **확인**: Service Worker 및 브라우저 캐시 삭제

### Edge에서 발생 가능한 오류

Edge는 Chrome과 동일한 Chromium 엔진을 사용하므로 동일한 오류가 발생할 수 있습니다.

## ✅ 필수 설정 체크리스트

### Google Cloud Console - OAuth 2.0 클라이언트 ID

#### 승인된 JavaScript 원본
- ✅ `http://localhost:5173`
- ✅ `http://localhost:5174` (개발 서버 포트 변경 시)
- ✅ `https://yago-vibe-spt.firebaseapp.com`
- ✅ `https://yago-vibe-spt.web.app`
- ✅ `https://www.yagovibe.com`
- ✅ `https://yagovibe.com`
- ✅ `https://yagovibe.vercel.app`

#### 승인된 리디렉션 URI
- ✅ `http://localhost:5173/_/auth/handler`
- ✅ `http://localhost:5174/_/auth/handler`
- ✅ `https://yago-vibe-spt.firebaseapp.com/_/auth/handler`
- ✅ `https://yago-vibe-spt.web.app/_/auth/handler`
- ✅ `https://www.yagovibe.com/_/auth/handler`
- ✅ `https://yagovibe.com/_/auth/handler`
- ✅ `https://yagovibe.vercel.app/_/auth/handler`
- ✅ `http://localhost:5173/login` (선택사항)
- ✅ `http://localhost:5174/login` (선택사항)

### Firebase Console - Authentication

#### Authorized Domains
- ✅ `localhost`
- ✅ `yago-vibe-spt.firebaseapp.com`
- ✅ `yago-vibe-spt.web.app`
- ✅ `yagovibe.com`
- ✅ `www.yagovibe.com`
- ✅ `yagovibe.vercel.app`

#### Sign-in Method - Google
- ✅ Google 제공자 활성화됨
- ✅ 웹 클라이언트 ID: `126699415285-4v86c8e1o426on56f2q8ruqo7rssrclh.apps.googleusercontent.com`

## 🔧 코드 변경 필요 여부

### 현재 코드 상태
- ✅ `signInWithRedirect` 사용 (팝업 방식보다 안정적)
- ✅ 중복 호출 방지 로직 구현됨
- ✅ Redirect 결과 처리 구현됨
- ✅ Firestore 프로필 자동 생성 구현됨

### 추가 개선 가능 사항
1. **브라우저별 오류 처리 강화** (선택사항)
   - Chrome/Edge별 특정 오류 메시지 표시
   - 브라우저 감지 및 맞춤형 안내

2. **환경 변수 검증 강화** (선택사항)
   - `.env.local` 파일 존재 여부 확인
   - 필수 환경 변수 누락 시 명확한 오류 메시지

## 📋 브라우저별 OAuth 디버그 체크리스트

### 수동 확인 항목

1. **Chrome에서 테스트**
   - [ ] `http://localhost:5173/login` 접속
   - [ ] Google 로그인 버튼 클릭
   - [ ] 콘솔 오류 확인
   - [ ] Network 탭에서 리다이렉션 확인

2. **Edge에서 테스트**
   - [ ] `http://localhost:5173/login` 접속
   - [ ] Google 로그인 버튼 클릭
   - [ ] 콘솔 오류 확인
   - [ ] Network 탭에서 리다이렉션 확인

3. **시크릿 모드에서 테스트**
   - [ ] Chrome 시크릿 모드
   - [ ] Edge 시크릿 모드
   - [ ] 동일한 오류 발생 여부 확인

4. **Service Worker 확인**
   - [ ] `chrome://serviceworker-internals` 접속
   - [ ] 관련 Service Worker Unregister
   - [ ] 다시 테스트

## 🎯 최종 권장 사항

1. **Google Cloud Console 설정 확인** (가장 중요)
   - 모든 Origin 및 Redirect URI 포함 확인

2. **Firebase Console 설정 확인**
   - Authorized Domains에 `localhost` 포함 확인

3. **브라우저 캐시 삭제**
   - Ctrl + Shift + Delete
   - Service Worker 제거

4. **시크릿 모드에서 테스트**
   - 캐시 없는 환경에서 정상 작동 여부 확인

5. **실제 배포 환경에서 테스트**
   - 로컬 오류가 배포 환경에도 영향을 주는지 확인

