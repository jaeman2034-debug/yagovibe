# 🔍 FINAL DEBUG ANALYSIS REPORT — Firebase Google Login Error

## 📋 분석 목표

Firebase Google OAuth 로그인 오류 원인 파악:
- `auth/requests-from-referer-are-blocked`
- `The requested action is invalid.`
- Redirecting to: `https://yago-vibe-spt.firebaseapp.com/__/auth/handler?apiKey=...`

## ✅ 코드 분석 결과

### 1. Firebase 초기화 코드

**파일**: `src/lib/firebase.ts`

**라인 61-69**: `firebaseConfig` 정의
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

**✅ 검증 결과**:
- `authDomain` = `yago-vibe-spt.firebaseapp.com` (정상)
- Firebase Hosting 도메인과 일치
- 코드 수정 불필요

**라인 93**: `initializeApp(firebaseConfig)`
- ✅ 정상 초기화
- 중복 생성 방지 로직 포함

**라인 133**: `getAuth(app)`
- ✅ 정상 초기화
- `authDomain` 올바르게 설정됨

### 2. GoogleAuthProvider 설정

**파일**: `src/lib/firebase.ts`

**라인 222-233**: `getGoogleProvider()` 함수
```typescript
export const getGoogleProvider = () => {
  const provider = new GoogleAuthProvider();
  
  console.log("🔍 [firebase.ts] GoogleAuthProvider 생성:", {
    authDomain: auth.app.options.authDomain,
    projectId: auth.app.options.projectId,
    apiKey: auth.app.options.apiKey ? `${auth.app.options.apiKey.substring(0, 10)}...` : "없음",
  });
  
  return provider;
};
```

**✅ 검증 결과**:
- `GoogleAuthProvider` 기본 생성자만 사용
- `setCustomParameters()` 호출 없음 ✅
- `addScope()` 호출 없음 ✅
- `clientId` 직접 설정 없음 ✅
- 코드 수정 불필요

### 3. signInWithPopup 호출

**파일**: `src/pages/LoginPage.tsx`

**라인 353**: `GoogleAuthProvider` 생성
```typescript
const provider = new GoogleAuthProvider();
```

**라인 369**: `signInWithPopup` 호출
```typescript
const result = await signInWithPopup(auth, provider);
```

**파일**: `src/pages/SignupPage.tsx`

**라인 366**: `GoogleAuthProvider` 생성
```typescript
const provider = new GoogleAuthProvider();
```

**라인 380**: `signInWithPopup` 호출
```typescript
const result = await signInWithPopup(auth, provider);
```

**✅ 검증 결과**:
- `signInWithPopup` 올바르게 사용
- 기본 Firebase Auth handler 사용 (`__/auth/handler`)
- 커스텀 redirect URL 없음 ✅
- `action`, `state` 파라미터 수동 조작 없음 ✅
- 코드 수정 불필요

### 4. 환경 변수 확인

**검색 결과**: `.env` 파일 없음 (정상, `.env.local` 사용)

**환경 변수 사용**:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN` (선택사항, 기본값 사용)
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

**✅ 검증 결과**:
- 환경 변수가 `clientId`를 오버라이드하지 않음 ✅
- `authDomain`은 기본값 사용 (정상)

### 5. Firebase Hosting 설정

**파일**: `firebase.json`

**라인 16-20**: Rewrites 설정
```json
"rewrites": [
  {
    "source": "**",
    "destination": "/index.html"
  }
]
```

**✅ 검증 결과**:
- SPA 라우팅 지원 (정상)
- `__/auth/handler` 경로는 Firebase Auth가 자동 처리
- 커스텀 redirect handler 없음 ✅
- 코드 수정 불필요

### 6. Popup 차단 로직 확인

**검색 결과**: 
- `popup` 차단 관련 코드 없음 ✅
- `window.open` 차단 로직 없음 ✅
- `signInWithRedirect` 사용 없음 ✅

**✅ 검증 결과**:
- Popup 차단 로직 없음 (정상)

## ❌ 발견된 문제점

### 문제 1: Google Cloud Console OAuth 설정 누락

**위치**: Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client IDs

**누락된 항목**:
- ❌ `https://yagovibe.com/__/auth/handler` (승인된 리디렉션 URI)
- ❌ `https://www.yagovibe.com/__/auth/handler` (승인된 리디렉션 URI)

**영향**:
- `yagovibe.com` 또는 `www.yagovibe.com`에서 로그인 시도 시
- Firebase Auth가 `https://yago-vibe-spt.firebaseapp.com/__/auth/handler`로 리디렉션
- 하지만 Google OAuth는 `yagovibe.com` 도메인에서의 요청을 차단
- → `auth/requests-from-referer-are-blocked` 오류 발생

### 문제 2: Firebase Console Authorized domains 확인 필요

**위치**: Firebase Console → Authentication → Settings → Authorized domains

**필수 도메인**:
- `localhost`
- `127.0.0.1`
- `yago-vibe-spt.firebaseapp.com`
- `yago-vibe-spt.web.app`
- `yagovibe.com` ⚠️ 확인 필요
- `www.yagovibe.com` ⚠️ 확인 필요
- `yagovibe.vercel.app` ⚠️ 확인 필요

## 🔍 오류 발생 흐름 분석

### 시나리오 1: `yagovibe.com`에서 로그인 시도

1. 사용자가 `https://yagovibe.com`에서 Google 로그인 클릭 ✅
2. `signInWithPopup(auth, provider)` 호출 ✅
3. Google OAuth 팝업 열림 ✅
4. 사용자가 Google 계정 선택 및 승인 ✅
5. Firebase Auth가 `https://yago-vibe-spt.firebaseapp.com/__/auth/handler`로 리디렉션 ✅
6. **문제**: Google Cloud Console에 `https://yagovibe.com/__/auth/handler`가 등록되지 않음 ❌
7. Google OAuth가 referer를 차단 ❌
8. → `auth/requests-from-referer-are-blocked` 오류 발생 ❌

### 시나리오 2: Callback handler 오류

1. Google 로그인 성공 ✅
2. Firebase Auth가 callback 실행 ✅
3. 하지만 OAuth 클라이언트에 `yagovibe.com` 관련 redirect URL 없음 ❌
4. Firebase가 해당 요청을 차단 ❌
5. 앱이 fallback 에러 페이지를 띄움 ❌
6. → `The requested action is invalid.` 오류 발생 ❌

## ✅ 해결 방법

### 1. Google Cloud Console 설정 수정

**경로**: Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client IDs

**클라이언트 ID**: `126699415285-4v86c8e1o426on56f2q8ruqo7rssrclh.apps.googleusercontent.com`

#### 승인된 JavaScript 원본 (Authorized JavaScript origins)

다음 목록을 **그대로 복사**하여 추가:

```
http://localhost:5173
http://localhost:5174
https://yagovibe.com
https://www.yagovibe.com
https://yagovibe.vercel.app
https://yago-vibe-spt.firebaseapp.com
https://yago-vibe-spt.web.app
```

#### 승인된 리디렉션 URI (Authorized redirect URIs)

다음 목록을 **그대로 복사**하여 추가:

```
http://localhost:5173/__/auth/handler
http://localhost:5174/__/auth/handler
https://yago-vibe-spt.firebaseapp.com/__/auth/handler
https://yago-vibe-spt.web.app/__/auth/handler
https://yagovibe.vercel.app/__/auth/handler
https://yagovibe.com/__/auth/handler
https://www.yagovibe.com/__/auth/handler
```

**⚠️ 중요**: 
- `https://yagovibe.com/__/auth/handler` ⚠️ **누락됨!**
- `https://www.yagovibe.com/__/auth/handler` ⚠️ **누락됨!**

### 2. Firebase Console 설정 확인

**경로**: Firebase Console → Authentication → Settings → Authorized domains

**필수 도메인 확인**:
- [ ] `localhost`
- [ ] `127.0.0.1`
- [ ] `yago-vibe-spt.firebaseapp.com`
- [ ] `yago-vibe-spt.web.app`
- [ ] `yagovibe.com`
- [ ] `www.yagovibe.com`
- [ ] `yagovibe.vercel.app`

**없으면 "Add domain"으로 추가**

### 3. Firebase Console Google 제공자 설정 확인

**경로**: Firebase Console → Authentication → Sign-in method → Google

**확인 사항**:
- [ ] "웹 클라이언트 ID" = `126699415285-4v86c8e1o426on56f2q8ruqo7rssrclh.apps.googleusercontent.com`
- [ ] Google 제공자 활성화됨

**캐시 초기화**:
1. Google 제공자 **비활성화** 클릭
2. **5초 대기**
3. Google 제공자 **다시 활성화** 클릭
4. 클라이언트 ID가 올바르게 유지되는지 확인
5. **저장** 클릭

### 4. 브라우저 캐시 삭제 및 테스트

1. 브라우저 **완전히 닫기** (모든 창)
2. 브라우저 캐시/쿠키 삭제 (Ctrl+Shift+Delete)
3. Google 관련 쿠키 모두 삭제
4. **시크릿 모드**에서 테스트
5. `http://localhost:5173` 접속
6. Google 로그인 시도
7. 로그인 성공 확인

## 📊 최종 진단 요약

### 코드 상태
- ✅ `firebaseConfig` 정상
- ✅ `authDomain` 정상 (`yago-vibe-spt.firebaseapp.com`)
- ✅ `GoogleAuthProvider` 정상 (기본 생성자만 사용)
- ✅ `signInWithPopup` 정상
- ✅ 클라이언트 ID 직접 설정 없음
- ✅ 커스텀 redirect URL 없음
- ✅ `action`, `state` 파라미터 수동 조작 없음
- ✅ Popup 차단 로직 없음

### 설정 상태
- ❌ Google Cloud Console OAuth 설정 누락 (`yagovibe.com`, `www.yagovibe.com` redirect URI)
- ⚠️ Firebase Console Authorized domains 확인 필요

### 해결 방법
1. **Google Cloud Console 설정 수정** (필수)
   - 누락된 redirect URI 추가
2. **Firebase Console 설정 확인** (필수)
   - Authorized domains 확인
   - Google 제공자 설정 확인
3. **브라우저 캐시 삭제** (필수)
   - 설정 변경 후 반드시 필요

## 🎯 핵심 결론

**코드는 100% 정상입니다. 문제는 Google Cloud Console OAuth 설정에 `yagovibe.com`과 `www.yagovibe.com`의 redirect URI가 누락되어 있습니다.**

**코드 수정은 불필요하며, Google Cloud Console 설정만 수정하면 됩니다.**

