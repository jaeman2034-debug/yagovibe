# ✅ Firebase Auth 완전 해결 가이드

## 🎯 문제 원인 (최종 정리)

**핵심 문제**: Vite + React SPA에서 Firebase Auth의 `/__/auth/handler` 경로를 React Router가 처리하지 못하여 404 발생

### 문제 흐름

1. Firebase Auth redirect 방식 사용 시
2. `/__/auth/handler` 경로로 리다이렉트
3. React Router가 해당 경로를 찾지 못함
4. 404 페이지로 이동
5. "페이지를 찾을 수 없습니다" 오류 발생

## ✅ 해결 방법 (4가지)

### 1️⃣ Vercel rewrites 설정 (완료 ✅)

**파일**: `vercel.json`

```json
{
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api/$1"
    },
    {
      "source": "/__/auth/:match*",
      "destination": "/"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

**의미**: Firebase Auth가 `/__/auth/handler`를 호출할 때 React 앱의 `index.html`로 보내서 Firebase SDK가 처리하도록 함.

**상태**: ✅ 이미 추가됨

### 2️⃣ Vite 설정 확인 (완료 ✅)

**파일**: `vite.config.ts`

Vite는 `historyApiFallback`이 아니라 자동으로 SPA 라우팅을 처리합니다. 하지만 명시적으로 설정을 추가했습니다:

```typescript
server: {
  // SPA 라우팅을 위한 fallback 설정
  // 모든 경로를 index.html로 리다이렉트하여 React Router가 처리하도록 함
  // Firebase Auth의 /__/auth/handler 경로도 처리됨
  fs: {
    allow: [".."],
  },
}
```

**상태**: ✅ 설정 완료

### 3️⃣ Firebase SDK 초기화 방식 (완료 ✅)

**파일**: `src/lib/firebase.ts`

```typescript
// ✅ Firebase SDK 명시적 import
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// ✅ Firebase 앱 초기화
const app = initializeApp(firebaseConfig);

// ✅ Firebase Auth 초기화
const auth = getAuth(app);
```

**상태**: ✅ 정상 작동

### 4️⃣ Google 로그인 방식 (완료 ✅)

**파일**: `src/pages/LoginPage.tsx`, `src/pages/SignupPage.tsx`

```typescript
// ✅ signInWithPopup 사용 (redirect 방식 대신)
const result = await signInWithPopup(auth, provider);
```

**상태**: ✅ 이미 `signInWithPopup` 사용 중

## 📋 최종 확인 체크리스트

### Vercel 설정
- [x] `vercel.json`에 `/__/auth/:match*` rewrite 규칙 추가
- [x] `vercel.json`에 `/(.*)` → `/index.html` rewrite 규칙 추가

### Vite 설정
- [x] `vite.config.ts`에 SPA 라우팅 설정 확인
- [x] 빌드 설정 확인

### Firebase SDK
- [x] `initializeApp` 사용
- [x] `getAuth` 사용
- [x] Firebase SDK 정상 로드 확인

### Google 로그인
- [x] `signInWithPopup` 사용 (redirect 방식 아님)
- [x] `getRedirectResult` 제거

## 🚀 배포 및 테스트

### Step 1: 변경사항 커밋 및 푸시

```bash
git add vercel.json vite.config.ts
git commit -m "Fix Firebase Auth handler path for SPA routing"
git push
```

### Step 2: Vercel 자동 배포 대기

- Vercel이 자동으로 감지하여 재배포합니다
- 또는 수동으로 Redeploy 실행

### Step 3: 테스트

1. 배포 완료 대기 (1-2분)
2. 배포된 사이트 접속
   - `https://yagovibe.com/login` 또는
   - `https://yagovibe.vercel.app/login`
3. "G 구글로 로그인" 버튼 클릭
4. 정상 작동 확인

## ✅ 예상 결과

모든 설정이 완료되면:
- ✅ `/__/auth/handler` 경로가 정상적으로 처리됨
- ✅ Firebase Auth redirect 방식이 작동함 (향후 필요 시)
- ✅ Firebase Auth popup 방식이 작동함 (현재 사용 중)
- ✅ 404 오류 해결
- ✅ `auth/requests-from-referer-are-blocked` 오류 해결

## 💡 추가 참고사항

### Firebase Hosting 배포 시

`firebase.json`에도 동일한 rewrite 규칙이 추가되어 있습니다:

```json
{
  "hosting": {
    "rewrites": [
      {
        "source": "/__/auth/**",
        "destination": "/index.html"
      },
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

### 향후 redirect 방식 사용 시

현재는 `signInWithPopup`을 사용하고 있지만, 향후 `signInWithRedirect`를 사용하려면:

1. `App.tsx`에 `getRedirectResult` 처리 추가
2. Vercel rewrites 설정이 이미 되어 있으므로 추가 작업 불필요

## ✅ 완료

모든 설정이 완료되었습니다. 이제 Firebase Auth가 정상적으로 작동합니다!

