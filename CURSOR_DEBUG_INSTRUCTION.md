# 🎯 Cursor에게 줄 완전 자동 디버깅 지시문

## 📋 디버깅 목표

프로젝트 전체에서 Firebase Google OAuth Redirect URL에 관련된 설정을 모두 점검하고, `auth/requests-from-referer-are-blocked` 오류의 원인을 찾아주세요.

## 🔍 필수 점검 사항

### 1. signInWithPopup 호출 검색

**작업**: `signInWithPopup(auth, provider)` 호출이 있는 모든 코드를 검색하세요.

**예상 위치**:
- `src/pages/LoginPage.tsx`
- `src/pages/SignupPage.tsx`
- 기타 인증 관련 컴포넌트

**확인 사항**:
- `signInWithPopup` 사용 여부
- `GoogleAuthProvider` 생성 방식
- 클라이언트 ID 직접 설정 여부

### 2. Firebase Auth Redirect URL 확인

**작업**: Firebase Auth가 사용하는 redirect URL이 `__/auth/handler`로 고정인지 확인하세요.

**확인 사항**:
- Firebase Auth는 항상 `https://<project>.firebaseapp.com/__/auth/handler`로 리디렉션
- 또는 커스텀 도메인 사용 시 `https://<custom-domain>/__/auth/handler`로 리디렉션
- 이 URL이 Google Cloud Console의 "승인된 리디렉션 URI"에 등록되어 있어야 함

**코드 확인**:
- `src/lib/firebase.ts`에서 `authDomain` 설정 확인
- 현재 값: `yago-vibe-spt.firebaseapp.com` (정상)

### 3. 배포 도메인 검출

**작업**: 현재 배포 도메인이 다음 중 하나인지 검출하세요:
- `yagovibe.com`
- `www.yagovibe.com`
- `yagovibe.vercel.app`
- `yago-vibe-spt.firebaseapp.com`
- `yago-vibe-spt.web.app`

**확인 사항**:
- Firebase Auth config에서 `authDomain`이 이 도메인 중 하나인지 확인
- `src/lib/firebase.ts`의 `authDomain` 설정 확인
- 현재 값: `yago-vibe-spt.firebaseapp.com` (정상)

### 4. authDomain과 OAuth Redirect Domain 일치 확인

**작업**: `authDomain` 값과 실제 OAuth Redirect Domain이 일치하지 않으면 경고하세요.

**확인 사항**:
- `authDomain` = `yago-vibe-spt.firebaseapp.com` (정상)
- Firebase Auth는 항상 `https://<authDomain>/__/auth/handler`로 리디렉션
- 이 URL이 Google Cloud Console에 등록되어 있어야 함

**현재 상태**:
- ✅ `authDomain` 설정 정상
- ❌ Google Cloud Console에 `yagovibe.com`과 `www.yagovibe.com`의 redirect URI 누락

### 5. 필요한 도메인 목록 제공

**작업**: 최종적으로 문제를 해결하려면 어떤 도메인을 Google Cloud Console에 등록해야 하는지 알려주세요.

**필수 등록 도메인**:

#### 승인된 JavaScript 원본
```
http://localhost:5173
http://localhost:5174
https://yagovibe.com
https://www.yagovibe.com
https://yagovibe.vercel.app
https://yago-vibe-spt.firebaseapp.com
https://yago-vibe-spt.web.app
```

#### 승인된 리디렉션 URI
```
http://localhost:5173/__/auth/handler
http://localhost:5174/__/auth/handler
https://yago-vibe-spt.firebaseapp.com/__/auth/handler
https://yago-vibe-spt.web.app/__/auth/handler
https://yagovibe.vercel.app/__/auth/handler
https://yagovibe.com/__/auth/handler
https://www.yagovibe.com/__/auth/handler
```

**⚠️ 누락된 항목**:
- `https://yagovibe.com/__/auth/handler` ⚠️
- `https://www.yagovibe.com/__/auth/handler` ⚠️

## 🔍 오류 메시지 분석

### 오류: `auth/requests-from-referer-are-blocked`

**원인**: Firebase Auth가 referer 차단을 하는 조건

1. **Redirect domain mismatch**: 
   - Google Cloud Console의 "승인된 리디렉션 URI"에 현재 도메인의 redirect URL이 없음
   - 예: `yagovibe.com`에서 로그인 시도 → `https://yagovibe.com/__/auth/handler`가 등록되지 않음

2. **Authorized domains mismatch**:
   - Firebase Console의 "승인된 도메인"에 현재 도메인이 없음
   - 예: `yagovibe.com`이 Authorized domains에 없음

3. **JavaScript origin mismatch**:
   - Google Cloud Console의 "승인된 JavaScript 원본"에 현재 도메인이 없음
   - 예: `https://yagovibe.com`이 등록되지 않음

**현재 문제**:
- ✅ Firebase Console Authorized domains: 모든 도메인 포함됨
- ✅ Google Cloud Console JavaScript origins: 대부분 포함됨
- ❌ **Google Cloud Console Redirect URIs: `yagovibe.com`과 `www.yagovibe.com` 누락**

## 📋 코드 점검 결과

### 1. signInWithPopup 호출 위치

**파일**: `src/pages/LoginPage.tsx`, `src/pages/SignupPage.tsx`

**코드**:
```typescript
const result = await signInWithPopup(auth, provider);
```

**상태**: ✅ 정상

### 2. GoogleAuthProvider 생성

**파일**: `src/lib/firebase.ts`

**코드**:
```typescript
export const getGoogleProvider = () => {
  const provider = new GoogleAuthProvider();
  return provider;
};
```

**상태**: ✅ 정상 (클라이언트 ID 직접 설정 없음)

### 3. authDomain 설정

**파일**: `src/lib/firebase.ts`

**코드**:
```typescript
authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "yago-vibe-spt.firebaseapp.com",
```

**상태**: ✅ 정상

### 4. Redirect URL 고정 확인

**Firebase Auth 동작**:
- Firebase Auth는 항상 `https://<authDomain>/__/auth/handler`로 리디렉션
- 현재 `authDomain` = `yago-vibe-spt.firebaseapp.com`
- 따라서 redirect URL = `https://yago-vibe-spt.firebaseapp.com/__/auth/handler`

**커스텀 도메인 사용 시**:
- 커스텀 도메인(`yagovibe.com`)에서 로그인 시도
- Firebase Auth는 여전히 `https://yago-vibe-spt.firebaseapp.com/__/auth/handler`로 리디렉션
- 하지만 Google OAuth는 `https://yagovibe.com/__/auth/handler`도 허용해야 함

**문제**: Google Cloud Console에 `https://yagovibe.com/__/auth/handler`가 등록되지 않음

## ✅ 최종 해결 방법

### Google Cloud Console 설정 수정

1. **Google Cloud Console 접속**
   - https://console.cloud.google.com
   - 프로젝트 선택
   - APIs & Services → Credentials → OAuth 2.0 Client IDs

2. **클라이언트 ID 편집**
   - 클라이언트 ID: `126699415285-4v86c8e1o426on56f2q8ruqo7rssrclh.apps.googleusercontent.com`
   - 클릭하여 편집

3. **"승인된 리디렉션 URI"에 추가**
   - `https://yagovibe.com/__/auth/handler` 추가
   - `https://www.yagovibe.com/__/auth/handler` 추가
   - 저장

4. **"승인된 JavaScript 원본" 확인**
   - `https://yagovibe.com` 포함 확인
   - `https://www.yagovibe.com` 포함 확인

5. **브라우저 캐시 삭제 및 테스트**
   - 브라우저 완전히 닫기
   - 캐시/쿠키 삭제
   - 시크릿 모드에서 테스트

## 🎯 핵심 요약

1. **코드는 정상**: 수정 불필요 ✅
2. **문제 원인**: Google Cloud Console OAuth 설정에 `yagovibe.com`과 `www.yagovibe.com`의 redirect URI 누락 ❌
3. **해결 방법**: Google Cloud Console에 누락된 redirect URI 추가 ✅
4. **테스트**: 브라우저 캐시 삭제 후 시크릿 모드에서 테스트 ✅
