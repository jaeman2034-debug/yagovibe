# 🔧 Firebase 환경 변수 오류 해결 가이드

## 🚨 현재 오류

배포된 사이트에서 Firebase 초기화 실패:
```
Firebase: Error (auth/requests-from-referer-https://www.yagovibe.com-are-blocked.)
```
또는
```
firebase is not defined
```

## ✅ 원인 분석

### 1. Firebase CDN 스크립트 문제 (해결됨)
- ❌ **문제**: `index.html`에 Firebase CDN 스크립트가 있으면 Vite 빌드 시 제거됨
- ✅ **해결**: Firebase Modular SDK v9 사용 (CDN 불필요)

### 2. Firebase Modular SDK import 문제 (해결됨)
- ❌ **문제**: `import firebase from "firebase/app"` (v8 방식)
- ✅ **해결**: `import { initializeApp } from "firebase/app"` (v9 방식)

### 3. 환경 변수 누락 문제 (⚠️ 확인 필요)
- ❌ **문제**: 배포 환경에서 환경 변수가 설정되지 않음
- ✅ **해결**: Firebase Hosting 환경 변수 설정 필요

## 🔥 해결 방법

### Step 1: 로컬 환경 변수 확인

`.env.local` 파일이 있는지 확인하고, 다음 변수들이 모두 설정되어 있는지 확인:

```bash
# 필수 Firebase 환경 변수
VITE_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_FIREBASE_AUTH_DOMAIN=yago-vibe-spt.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=yago-vibe-spt
VITE_FIREBASE_STORAGE_BUCKET=yago-vibe-spt.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdefghijklmnop
```

### Step 2: Firebase Hosting 환경 변수 설정

**⚠️ 중요**: Firebase Hosting는 환경 변수를 직접 지원하지 않습니다!

대신 다음 방법을 사용해야 합니다:

#### 방법 1: 빌드 시 환경 변수 주입 (권장)

`.env.production` 파일 생성:

```bash
# .env.production
VITE_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdefghijklmnop
```

이 파일은 Git에 커밋하지 않도록 `.gitignore`에 추가:

```gitignore
.env.production
.env.local
.env*.local
```

#### 방법 2: 빌드 스크립트에서 환경 변수 주입

`package.json`의 `build` 스크립트 수정:

```json
{
  "scripts": {
    "build": "VITE_FIREBASE_API_KEY=xxx VITE_FIREBASE_MESSAGING_SENDER_ID=xxx npm run build:internal",
    "build:internal": "node scripts/generate-sitemap.js && vite build"
  }
}
```

#### 방법 3: Firebase Functions에서 환경 변수 관리

Firebase Functions를 사용하는 경우:

```bash
firebase functions:config:set firebase.api_key="xxx"
```

### Step 3: 배포 전 환경 변수 확인

배포 전에 다음 스크립트로 환경 변수 확인:

```bash
npm run check:env
```

또는 직접 확인:

```bash
# 빌드 후 dist 폴더에서 확인
npm run build
cat dist/index.html | grep -i firebase
```

### Step 4: 브라우저에서 디버깅

배포된 사이트에서 브라우저 콘솔 열기 (F12) 후:

```javascript
// 환경 변수 확인
console.log(import.meta.env);

// Firebase 초기화 확인
console.log(window.__FIREBASE_DEFAULTS__);
```

**예상 결과:**
- ✅ `import.meta.env.VITE_FIREBASE_API_KEY`가 정의되어 있어야 함
- ✅ Firebase 초기화 로그가 콘솔에 표시되어야 함

## 📋 체크리스트

### 로컬 개발 환경
- [ ] `.env.local` 파일 존재 확인
- [ ] 모든 필수 환경 변수 설정 확인
- [ ] `npm run dev` 실행 시 콘솔에 환경 변수 로그 확인

### 배포 환경
- [ ] `.env.production` 파일 생성 (또는 빌드 스크립트 수정)
- [ ] Firebase Hosting에 배포
- [ ] 배포된 사이트에서 브라우저 콘솔 확인
- [ ] 환경 변수가 `undefined`가 아닌지 확인

### Firebase Console 설정
- [ ] Firebase Console > Authentication > Settings > Authorized domains
- [ ] `www.yagovibe.com` 추가 확인
- [ ] `yagovibe.com` 추가 확인
- [ ] `yago-vibe-spt.web.app` 추가 확인

## 🚨 여전히 안 되는 경우

### 1. 환경 변수가 여전히 undefined인 경우

**원인**: Vite 빌드 시 환경 변수가 주입되지 않음

**해결**:
1. `.env.production` 파일 확인
2. 빌드 스크립트에서 환경 변수 주입 확인
3. `vite.config.ts`에서 환경 변수 처리 확인

### 2. Firebase 초기화는 성공하지만 인증 오류 발생

**원인**: Authorized domains 누락

**해결**:
1. Firebase Console > Authentication > Settings
2. Authorized domains에 모든 도메인 추가

### 3. 빌드는 성공하지만 런타임 오류 발생

**원인**: 환경 변수가 빌드 타임에만 주입되고 런타임에 접근 불가

**해결**:
- Vite는 빌드 타임에 환경 변수를 주입하므로, 배포 전에 `.env.production` 파일이 올바른지 확인

## 💡 참고사항

- Vite는 `VITE_` 접두사가 있는 환경 변수만 클라이언트에 노출합니다
- 환경 변수는 빌드 타임에 주입되므로, 배포 후 변경하려면 다시 빌드해야 합니다
- Firebase Hosting는 환경 변수를 직접 지원하지 않으므로, 빌드 시 주입해야 합니다

